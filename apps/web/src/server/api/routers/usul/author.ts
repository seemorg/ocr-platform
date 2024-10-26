import {
  createAuthor,
  createAuthorSchema,
} from "@/server/services/usul/author/create";
import {
  updateAuthor,
  updateAuthorSchema,
} from "@/server/services/usul/author/update";
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
          yearStatus: true,
          primaryNameTranslations: {
            where: {
              locale: "ar",
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
              locale: "ar",
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
        yearStatus: author.yearStatus,
        arabicName: author.primaryNameTranslations[0]?.text,
        otherArabicNames: author.otherNameTranslations[0]?.texts,
        transliteratedName: author.transliteration,
        arabicBio: author.bioTranslations[0]?.text,
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
          yearStatus: true,
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
          yearStatus: author.yearStatus,
        };
      });

      return preparedAuthors;
    }),
  create: protectedProcedure
    .input(createAuthorSchema)
    .mutation(async ({ ctx, input }) => {
      return await createAuthor(input, ctx.usulDb);
    }),
  update: protectedProcedure
    .input(updateAuthorSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateAuthor(input, ctx.usulDb);
    }),
});
