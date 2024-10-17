import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulGenreRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.genre.delete({ where: { id: input.id } });
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
      return ctx.usulDb.genre.create({
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
        ctx.usulDb.genre.update({
          where: { id: input.id },
          data: {
            transliteration: input.transliteration,
            slug: input.slug,
          },
        }),
        ctx.usulDb.genreName.updateMany({
          where: { genreId: input.id, locale: "ar" },
          data: {
            text: input.arabicName,
          },
        }),
        ctx.usulDb.genreName.updateMany({
          where: { genreId: input.id, locale: "en" },
          data: {
            text: input.englishName,
          },
        }),
      ]);
    }),
});
