import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulRegionRouter = createTRPCRouter({
  searchRegions: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const regions = await ctx.usulDb.region.findMany({
        where: {
          OR: [
            {
              transliteration: {
                contains: input.query,
                mode: "insensitive",
              },
            },
            {
              nameTranslations: {
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
          nameTranslations: {
            where: {
              locale: {
                in: ["ar", "en"],
              },
            },
            select: {
              text: true,
              locale: true,
            },
          },
        },
      });

      const preparedRegions = regions.map((region) => {
        return {
          id: region.id,
          slug: region.slug,
          arabicName:
            region.nameTranslations.find((n) => n.locale === "ar")?.text ??
            null,
          englishName:
            region.nameTranslations.find((n) => n.locale === "en")?.text ??
            null,
          transliteratedName: region.transliteration,
        };
      });

      return preparedRegions;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.region.delete({ where: { id: input.id } });
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
      return ctx.usulDb.region.create({
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
        ctx.usulDb.region.update({
          where: { id: input.id },
          data: {
            transliteration: input.transliteration,
            slug: input.slug,
          },
        }),
        ctx.usulDb.regionName.updateMany({
          where: { regionId: input.id, locale: "ar" },
          data: {
            text: input.arabicName,
          },
        }),
        ctx.usulDb.regionName.updateMany({
          where: { regionId: input.id, locale: "en" },
          data: {
            text: input.englishName,
          },
        }),
      ]);
    }),
});
