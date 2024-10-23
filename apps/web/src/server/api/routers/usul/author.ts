import { addAuthorToPipeline } from "@/lib/usul-pipeline";
import { createUniqueAuthorSlug } from "@/server/services/usul/author";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulAuthorRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.author.delete({ where: { id: input.id } });
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const author = await ctx.usulDb.author.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          year: true,
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
          bioTranslations: {
            where: {
              locale: "en",
            },
          },
        },
      });

      if (!author) {
        return null;
      }

      const preparedAuthor = {
        id: author.id,
        year: author.year,
        arabicName: author.primaryNameTranslations.find(
          (translation) => translation.locale === "ar",
        )?.text,
        englishName: author.primaryNameTranslations.find(
          (translation) => translation.locale === "en",
        )?.text,
        transliteratedName: author.transliteration,
        otherNames: author.otherNameTranslations[0]?.texts,
        bio: author.bioTranslations[0]?.text,
      };

      return preparedAuthor;
    }),
  searchAuthors: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const authors = await ctx.usulDb.author.findMany({
        where: {
          OR: [
            {
              transliteration: {
                contains: input.query,
                mode: "insensitive",
              },
            },
            {
              primaryNameTranslations: {
                some: {
                  text: {
                    mode: "insensitive",
                    contains: input.query,
                  },
                },
              },
            },
          ],
        },
        ...(!input.query
          ? {
              take: 10,
            }
          : {}),
        select: {
          id: true,
          transliteration: true,
          slug: true,
          year: true,
          primaryNameTranslations: {
            where: {
              locale: {
                in: ["ar", "en"],
              },
            },
            select: {
              text: true,
            },
          },
        },
      });

      const preparedAuthors = authors.map((author) => {
        return {
          id: author.id,
          slug: author.slug,
          arabicName: author.primaryNameTranslations[0]?.text ?? null,
          transliteratedName: author.transliteration,
          year: author.year,
        };
      });

      return preparedAuthors;
    }),
  create: protectedProcedure
    .input(
      z.object({
        arabicName: z.string(),
        transliteration: z.string(),
        otherArabicNames: z.array(z.string()).optional(),
        englishName: z.string().optional(),
        englishBio: z.string().optional(),
        slug: z.string().optional(),
        deathYear: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let slug;

      if (input.slug) {
        slug = input.slug;
      } else {
        slug = await createUniqueAuthorSlug(input.transliteration, ctx.usulDb);
      }

      const newAuthor = await ctx.usulDb.author.create({
        data: {
          id: createId(),
          slug,
          transliteration: input.transliteration,
          year: input.deathYear,
          ...(input.otherArabicNames
            ? {
                otherNameTranslations: {
                  create: {
                    locale: "ar",
                    texts: input.otherArabicNames,
                  },
                },
              }
            : {}),
          primaryNameTranslations: {
            createMany: {
              data: [
                {
                  locale: "ar",
                  text: input.arabicName,
                },
                ...(input.englishName
                  ? [{ locale: "en", text: input.englishName }]
                  : []),
              ],
            },
          },
          ...(input.englishBio
            ? {
                bioTranslations: {
                  createMany: {
                    data: [{ locale: "en", text: input.englishBio }],
                  },
                },
              }
            : {}),
        },
      });

      await addAuthorToPipeline({
        slug: newAuthor.slug,
        arabicName: input.arabicName,
      });

      return { id: newAuthor.id };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        arabicName: z.string(),
        transliteration: z.string(),
        otherArabicNames: z.array(z.string()).optional(),
        englishName: z.string().optional(),
        englishBio: z.string().optional(),
        deathYear: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: call webhook for regenerating data
      return ctx.usulDb.author.update({
        where: { id: input.id },
        data: {
          transliteration: input.transliteration,
          year: input.deathYear,
          ...(input.otherArabicNames
            ? {
                otherNameTranslations: {
                  upsert: {
                    where: {
                      authorId_locale: {
                        authorId: input.id,
                        locale: "ar",
                      },
                    },
                    create: {
                      locale: "ar",
                      texts: input.otherArabicNames,
                    },
                    update: {
                      texts: input.otherArabicNames,
                    },
                  },
                },
              }
            : {}),
          primaryNameTranslations: {
            upsert: [
              {
                where: {
                  authorId_locale: {
                    authorId: input.id,
                    locale: "ar",
                  },
                },
                create: {
                  locale: "ar",
                  text: input.arabicName,
                },
                update: {
                  text: input.arabicName,
                },
              },
              ...(input.englishName
                ? [
                    {
                      where: {
                        authorId_locale: {
                          authorId: input.id,
                          locale: "en",
                        },
                      },
                      create: {
                        locale: "en",
                        text: input.englishName,
                      },
                      update: {
                        text: input.englishName,
                      },
                    },
                  ]
                : []),
            ],
          },
          ...(input.englishBio
            ? {
                bioTranslations: {
                  upsert: {
                    where: {
                      authorId_locale: {
                        authorId: input.id,
                        locale: "en",
                      },
                    },
                    create: {
                      locale: "en",
                      text: input.englishBio,
                    },
                    update: {
                      text: input.englishBio,
                    },
                  },
                },
              }
            : {}),
        },
      });
    }),
});
