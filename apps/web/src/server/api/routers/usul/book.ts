import type { usulDb } from "@/server/db";
import { textToSlug } from "@/lib/slug";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

const doesSlugExist = async (slug: string, db: typeof usulDb) => {
  const book = await db.book.findFirst({
    where: { slug },
    select: { id: true },
  });

  return !!book;
};

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
        author: z.object({
          _airtableReference: z.string(),
          isUsul: z.boolean(),
          usulUrl: z.string().url().optional(),
          arabicName: z.string(),
          transliteratedName: z.string().optional(),
          diedYear: z.number().optional(),
        }),
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

      let authorId: string;
      if (input.author.isUsul) {
        if (!input.author.usulUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Usul URL is required",
          });
        }

        const authorSlug = input.author.usulUrl?.split("/").pop();
        const author = await ctx.usulDb.author.findFirst({
          where: {
            slug: authorSlug,
          },
          select: {
            id: true,
          },
        });

        if (!author) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Author not found while marked as usul author",
          });
        }

        authorId = author.id;
      } else {
        const result = await ctx.usulDb.author.findFirst({
          where: {
            extraProperties: {
              path: ["_airtableReference"],
              equals: input.author._airtableReference,
            },
          },
          select: {
            id: true,
          },
        });

        if (result) {
          authorId = result.id;
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
        slug = textToSlug(input.transliteratedName);
        let increment = 0;
        while (await doesSlugExist(slug, ctx.usulDb)) {
          increment++;
          slug = textToSlug(input.transliteratedName + "-" + increment);
        }
      }

      const book = await ctx.usulDb.$transaction(async (tx) => {
        if (authorId) {
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
          const newAuthor = await tx.author.create({
            data: {
              id: createId(),
              slug: textToSlug(
                input.author.transliteratedName || input.author.arabicName,
              ),
              primaryNameTranslations: {
                create: {
                  locale: "ar",
                  text: input.author.arabicName,
                },
              },
              transliteration: input.author.transliteratedName,
              year: input.author.diedYear!,
              extraProperties: {
                _airtableReference: input.author._airtableReference,
              },
              numberOfBooks: 1,
            },
          });
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
        slug = textToSlug(input.transliteratedName);
        let increment = 0;
        while (await doesSlugExist(slug, ctx.usulDb)) {
          increment++;
          slug = textToSlug(input.transliteratedName + "-" + increment);
        }
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

      return book;
    }),
});
