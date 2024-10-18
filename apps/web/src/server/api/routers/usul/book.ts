import { addAuthorToPipeline, addBookToPipeline } from "@/lib/usul-pipeline";
import {
  createUniqueAuthorSlug,
  getAuthor,
} from "@/server/services/usul/author";
import { createUniqueBookSlug } from "@/server/services/usul/book";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulBookRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const book = await ctx.usulDb.book.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          author: {
            select: {
              id: true,
              slug: true,
              transliteration: true,
              primaryNameTranslations: {
                where: {
                  locale: {
                    in: ["ar", "en"],
                  },
                },
              },
            },
          },
          primaryNameTranslations: {
            where: {
              locale: {
                in: ["ar", "en"],
              },
            },
          },
          otherNameTranslations: {
            where: {
              locale: "ar",
            },
          },
          transliteration: true,
          advancedGenres: {
            select: { id: true },
          },
          versions: true,
        },
      });

      if (!book) {
        return null;
      }

      const version = book.versions.find((version) => version.source === "pdf");

      const preparedBook = {
        id: book.id,
        arabicName: book.primaryNameTranslations.find(
          (translation) => translation.locale === "ar",
        )?.text,
        englishName: book.primaryNameTranslations.find(
          (translation) => translation.locale === "en",
        )?.text,
        transliteratedName: book.transliteration,
        otherNames: book.otherNameTranslations[0]?.texts,
        advancedGenres: book.advancedGenres.map((genre) => genre.id),
        author: {
          id: book.author.id,
          slug: book.author.slug,
          name: (book.author.primaryNameTranslations[0]?.text ??
            book.author.transliteration)!,
        },
        pdfUrl: version?.value,
        investigator: version?.publicationDetails?.investigator,
        publisher: version?.publicationDetails?.publisher,
        editionNumber: version?.publicationDetails?.editionNumber,
        publicationYear: version?.publicationDetails?.publicationYear,
      };

      return preparedBook;
    }),
  deleteBook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.usulDb.book.delete({
        where: { id: input.id },
      });
    }),
  checkAirtableReference: protectedProcedure
    .input(
      z.object({
        airtableReference: z.string(),
        authorAirtableReference: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [book, author] = await Promise.all([
        ctx.usulDb.book.findFirst({
          where: {
            extraProperties: {
              path: ["_airtableReference"],
              equals: input.airtableReference,
            },
          },
          select: {
            id: true,
          },
        }),
        ctx.usulDb.author.findFirst({
          where: {
            extraProperties: {
              path: ["_airtableReference"],
              equals: input.authorAirtableReference,
            },
          },
        }),
      ]);

      return {
        bookExists: !!book,
        authorExists: !!author,
      };
    }),
  importFromAirtable: protectedProcedure
    .input(
      z.object({
        _airtableReference: z.string().optional(),
        arabicName: z.string(),
        transliteratedName: z.string(),
        slug: z.string().optional(),
        advancedGenres: z.array(z.string()),
        otherNames: z.array(z.string()).optional(),
        investigator: z.string().optional(),
        publisher: z.string().optional(),
        editionNumber: z.string().optional(),
        publicationYear: z.number().optional(),
        author: z.discriminatedUnion("isUsul", [
          z.object({
            isUsul: z.literal(true),
            slug: z.string(),
          }),
          z.object({
            isUsul: z.literal(false),
            _airtableReference: z.string(),
            arabicName: z.string(),
            transliteratedName: z.string(),
            diedYear: z.number().optional(),
          }),
        ]),
        pdfUrl: z.string(),
        splitsData: z
          .array(
            z.object({
              start: z.number(),
              end: z.number(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.pdfUrl.startsWith("https://assets.usul.ai/pdfs/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PDF URL must start with https://assets.usul.ai/pdfs/",
        });
      }

      if (input._airtableReference) {
        const book = await ctx.usulDb.book.findFirst({
          where: {
            extraProperties: {
              path: ["_airtableReference"],
              equals: input._airtableReference,
            },
          },
          select: {
            id: true,
          },
        });

        if (book) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Book already exists",
          });
        }
      }

      let newAuthorParams: {
        slug: string;
        arabicName: string;
      } | null = null;
      let authorArabicName: string;
      let createAuthor = false;

      let authorId: string;
      if (input.author.isUsul) {
        const author = await getAuthor({ slug: input.author.slug }, ctx.usulDb);
        if (!author) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Author not found",
          });
        }

        authorArabicName = author.name;
        authorId = author.id;
      } else {
        const author = await getAuthor(
          { _airtableReference: input.author._airtableReference },
          ctx.usulDb,
        );

        if (author) {
          authorId = author.id;
          authorArabicName = author.name;
        } else {
          createAuthor = true;
        }
      }

      const advancedGenres = await ctx.usulDb.advancedGenre.findMany({
        where: {
          id: {
            in: input.advancedGenres,
          },
        },
        select: {
          id: true,
          extraProperties: true,
        },
      });

      const simpleGenreIds = [
        ...new Set(
          advancedGenres
            .map((genre) => genre.extraProperties.simpleGenreId)
            .filter((id): id is string => !!id),
        ),
      ];

      let slug;
      if (input.slug) {
        slug = input.slug;
      } else {
        slug = await createUniqueBookSlug(input.transliteratedName, ctx.usulDb);
      }

      let authorSlug: string | undefined;
      if (createAuthor) {
        authorSlug = await createUniqueAuthorSlug(
          (
            input.author as {
              transliteratedName: string;
            }
          ).transliteratedName,
          ctx.usulDb,
        );
      }

      const book = await ctx.usulDb.$transaction(async (tx) => {
        if (!createAuthor) {
          await tx.author.update({
            where: {
              id: authorId,
            },
            data: {
              numberOfBooks: {
                increment: 1,
              },
            },
          });
        } else {
          const validatedAuthor = input.author as {
            _airtableReference: string;
            arabicName: string;
            transliteratedName: string;
            diedYear: number;
          };
          const newAuthor = await tx.author.create({
            data: {
              id: createId(),
              slug: authorSlug!,
              primaryNameTranslations: {
                create: {
                  locale: "ar",
                  text: validatedAuthor.arabicName,
                },
              },
              transliteration: validatedAuthor.transliteratedName,
              year: validatedAuthor.diedYear,
              extraProperties: {
                _airtableReference: validatedAuthor._airtableReference,
              },
              numberOfBooks: 1,
            },
          });

          newAuthorParams = {
            slug: newAuthor.slug,
            arabicName: validatedAuthor.arabicName,
          };
          authorArabicName = validatedAuthor.arabicName;
          authorId = newAuthor.id;
        }

        // increment advancedGenres and genres
        await tx.advancedGenre.updateMany({
          where: {
            id: {
              in: advancedGenres.map((genre) => genre.id),
            },
          },
          data: {
            numberOfBooks: {
              increment: 1,
            },
          },
        });

        await tx.genre.updateMany({
          where: {
            id: {
              in: simpleGenreIds,
            },
          },
          data: {
            numberOfBooks: {
              increment: 1,
            },
          },
        });

        return tx.book.create({
          select: { id: true },
          data: {
            id: createId(),
            primaryNameTranslations: {
              create: {
                locale: "ar",
                text: input.arabicName,
              },
            },
            otherNameTranslations: {
              create: {
                locale: "ar",
                texts: input.otherNames,
              },
            },
            transliteration: input.transliteratedName,
            slug,
            ...(simpleGenreIds.length > 0
              ? {
                  genres: {
                    connect: simpleGenreIds.map((genre) => ({ id: genre })),
                  },
                }
              : {}),
            advancedGenres: {
              connect: advancedGenres.map((genre) => ({ id: genre.id })),
            },
            author: { connect: { id: authorId } },
            versions: [
              {
                source: "pdf",
                value: input.pdfUrl,
                publicationDetails: {
                  ...(input.investigator
                    ? { investigator: input.investigator }
                    : {}),
                  ...(input.publisher ? { publisher: input.publisher } : {}),
                  ...(input.editionNumber
                    ? { editionNumber: input.editionNumber }
                    : {}),
                  ...(input.publicationYear
                    ? { publicationYear: input.publicationYear }
                    : {}),
                },
              },
            ],
            extraProperties: {
              ...(input.splitsData && input.splitsData.length > 0
                ? { splitsData: input.splitsData }
                : {}),
              _airtableReference: input._airtableReference,
            },
          },
        });
      });

      if (newAuthorParams) {
        await addAuthorToPipeline(newAuthorParams);
      }

      await addBookToPipeline({
        slug,
        arabicName: input.arabicName,
        authorArabicName: authorArabicName!,
      });

      return book;
    }),
  create: protectedProcedure
    .input(
      z.object({
        arabicName: z.string(),
        transliteratedName: z.string(),
        slug: z.string().optional(),
        advancedGenres: z.array(z.string()),
        otherNames: z.array(z.string()).optional(),
        authorId: z.string(),
        pdfUrl: z.string(),
        investigator: z.string().optional(),
        publisher: z.string().optional(),
        editionNumber: z.string().optional(),
        publicationYear: z.number().optional(),
        splitsData: z
          .array(
            z.object({
              start: z.number(),
              end: z.number(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.pdfUrl.startsWith("https://assets.usul.ai/pdfs/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PDF URL must start with https://assets.usul.ai/pdfs/",
        });
      }

      const author = await getAuthor({ id: input.authorId }, ctx.usulDb);

      if (!author) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Author not found",
        });
      }

      const advancedGenres = await ctx.usulDb.advancedGenre.findMany({
        where: {
          id: {
            in: input.advancedGenres,
          },
        },
        select: {
          id: true,
          extraProperties: true,
        },
      });

      const simpleGenreIds = [
        ...new Set(
          advancedGenres
            .map((genre) => genre.extraProperties.simpleGenreId)
            .filter((id): id is string => !!id),
        ),
      ];

      let slug;
      if (input.slug) {
        slug = input.slug;
      } else {
        slug = await createUniqueBookSlug(input.transliteratedName, ctx.usulDb);
      }

      const book = await ctx.usulDb.$transaction(async (tx) => {
        // increment advancedGenres and genres
        await tx.advancedGenre.updateMany({
          where: {
            id: {
              in: advancedGenres.map((genre) => genre.id),
            },
          },
          data: {
            numberOfBooks: {
              increment: 1,
            },
          },
        });

        await tx.genre.updateMany({
          where: {
            id: {
              in: simpleGenreIds,
            },
          },
          data: {
            numberOfBooks: {
              increment: 1,
            },
          },
        });

        await tx.author.update({
          where: {
            id: input.authorId,
          },
          data: {
            numberOfBooks: {
              increment: 1,
            },
          },
        });

        return tx.book.create({
          select: { id: true },
          data: {
            id: createId(),
            primaryNameTranslations: {
              create: {
                locale: "ar",
                text: input.arabicName,
              },
            },
            otherNameTranslations: {
              create: {
                locale: "ar",
                texts: input.otherNames,
              },
            },
            transliteration: input.transliteratedName,
            slug,
            ...(simpleGenreIds.length > 0
              ? {
                  genres: {
                    connect: simpleGenreIds.map((genre) => ({ id: genre })),
                  },
                }
              : {}),
            advancedGenres: {
              connect: advancedGenres.map((genre) => ({ id: genre.id })),
            },
            author: { connect: { id: input.authorId } },
            versions: [
              {
                source: "pdf",
                value: input.pdfUrl,
                publicationDetails: {
                  ...(input.investigator
                    ? { investigator: input.investigator }
                    : {}),
                  ...(input.publisher ? { publisher: input.publisher } : {}),
                  ...(input.editionNumber
                    ? { editionNumber: input.editionNumber }
                    : {}),
                  ...(input.publicationYear
                    ? { publicationYear: input.publicationYear }
                    : {}),
                },
              },
            ],
            extraProperties: {
              ...(input.splitsData && input.splitsData.length > 0
                ? { splitsData: input.splitsData }
                : {}),
            },
          },
        });
      });

      await addBookToPipeline({
        slug,
        arabicName: input.arabicName,
        authorArabicName: author.name,
      });

      return book;
    }),
});
