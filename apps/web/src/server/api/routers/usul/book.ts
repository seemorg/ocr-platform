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

const publicationDetailsSchema = {
  publisher: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.number().optional(),
  investigator: z.string().optional(),
};

const versionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("external"),
    url: z.string().url(),
    ...publicationDetailsSchema,
  }),
  z.object({
    type: z.literal("pdf"),
    url: z.string().url().startsWith("https://assets.usul.ai/pdfs/"),
    splitsData: z
      .array(
        z.object({
          start: z.number(),
          end: z.number(),
        }),
      )
      .optional(),
    ...publicationDetailsSchema,
  }),
]);

// const externalVersionSchema = z
//   .object({
//     url: z.string().url().optional(),
//     ...publicationDetailsSchema,
//   })
//   .optional();

// const pdfVersionSchema = z
//   .object({
//     url: z.string().url().optional(),

//     ...publicationDetailsSchema,
//   })
//   .optional();

const prepareVersions = (versions: z.infer<typeof versionSchema>[]) => {
  const final: PrismaJson.BookVersion[] = [];
  versions.forEach((version) => {
    const publicationDetails = {
      ...(version.investigator ? { investigator: version.investigator } : {}),
      ...(version.publisher ? { publisher: version.publisher } : {}),
      ...(version.editionNumber
        ? {
            editionNumber: version.editionNumber,
          }
        : {}),
      ...(version.publicationYear
        ? {
            publicationYear: version.publicationYear,
          }
        : {}),
    };

    if (version.type === "external") {
      final.push({
        source: "external" as const,
        value: version.url,
        publicationDetails,
      });
    }

    if (version.type === "pdf") {
      final.push({
        source: "pdf" as const,
        value: version.url,
        publicationDetails,
        ...(version.splitsData && version.splitsData.length > 0
          ? { splitsData: version.splitsData }
          : {}),
      });
    }
  });

  return final;
};

export const usulBookRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const book = await ctx.usulDb.book.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          physicalDetails: true,
          author: {
            select: {
              id: true,
              slug: true,
              transliteration: true,
              year: true,
              primaryNameTranslations: {
                where: {
                  locale: "ar",
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

      const pdfVersion = book.versions.find(
        (version) => version.source === "pdf",
      );
      const externalVersion = book.versions.find(
        (version) => version.source === "external",
      );

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
          slug: book.author.slug,
          arabicName: book.author.primaryNameTranslations[0]?.text,
          transliteratedName: book.author.transliteration,
          diedYear: book.author.year,
        },
        pdfVersion: pdfVersion,
        externalVersion: externalVersion,
        physicalDetails: book.physicalDetails,
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
          select: {
            id: true,
          },
        }),
      ]);

      return {
        bookExists: !!book,
        authorExists: !!author,
        bookId: book?.id,
        authorId: author?.id,
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
        physicalDetails: z.string().optional(),
        versions: z.array(versionSchema),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

        const versions = prepareVersions(input.versions);

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
            versions,
            numberOfVersions: versions.length,
            physicalDetails: input.physicalDetails,
            extraProperties: {
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
        physicalDetails: z.string().optional(),
        authorSlug: z.string(),
        versions: z.array(versionSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const author = await getAuthor({ slug: input.authorSlug }, ctx.usulDb);

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
            id: author.id,
          },
          data: {
            numberOfBooks: {
              increment: 1,
            },
          },
        });

        const versions = prepareVersions(input.versions);

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
            author: { connect: { id: author.id } },
            versions,
            numberOfVersions: versions.length,
            physicalDetails: input.physicalDetails,
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
