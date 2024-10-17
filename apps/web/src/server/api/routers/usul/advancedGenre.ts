import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulAdvancedGenreRouter = createTRPCRouter({
  allAdvancedGenres: protectedProcedure.query(async ({ ctx }) => {
    const advancedGenres = await ctx.usulDb.advancedGenre.findMany({
      select: {
        id: true,
        nameTranslations: {
          where: {
            locale: "ar",
          },
          select: {
            text: true,
          },
        },
        extraProperties: true,
      },
    });

    return advancedGenres.map((advancedGenre) => ({
      id: advancedGenre.id,
      name: advancedGenre.nameTranslations[0]!.text,
      ...(advancedGenre.extraProperties._airtableReference
        ? {
            _airtableReference:
              advancedGenre.extraProperties._airtableReference,
          }
        : {}),
    }));
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.advancedGenre.delete({ where: { id: input.id } });
    }),
  create: protectedProcedure
    .input(
      z.object({
        arabicName: z.string(),
        englishName: z.string(),
        transliteration: z.string().optional(),
        slug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.advancedGenre.create({
        data: {
          id: createId(),
          transliteration: input.transliteration,
          nameTranslations: {
            createMany: {
              data: [
                {
                  locale: "ar",
                  text: input.arabicName,
                },
                {
                  locale: "en",
                  text: input.englishName,
                },
              ],
            },
          },
          slug: input.slug,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        arabicName: z.string(),
        englishName: z.string(),
        transliteration: z.string().optional(),
        slug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.$transaction([
        ctx.usulDb.advancedGenre.update({
          where: { id: input.id },
          data: {
            transliteration: input.transliteration,
            slug: input.slug,
          },
        }),
        ctx.usulDb.advancedGenreName.updateMany({
          where: { genreId: input.id, locale: "ar" },
          data: {
            text: input.arabicName,
          },
        }),
        ctx.usulDb.advancedGenreName.updateMany({
          where: { genreId: input.id, locale: "en" },
          data: {
            text: input.englishName,
          },
        }),
      ]);
    }),
});
