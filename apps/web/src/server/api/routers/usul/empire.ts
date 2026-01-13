import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulEmpireRouter = createTRPCRouter({
  searchEmpires: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const empires = await ctx.usulDb.empire.findMany({
        where: {
          OR: [
            {
              transliteration: {
                contains: input.query,
                mode: "insensitive",
              },
            },
            {
              EmpireName: {
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
          EmpireName: {
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

      const preparedEmpires = empires.map((empire) => {
        return {
          id: empire.id,
          slug: empire.slug,
          arabicName:
            empire.EmpireName.find((n) => n.locale === "ar")?.text ?? null,
          englishName:
            empire.EmpireName.find((n) => n.locale === "en")?.text ?? null,
          transliteratedName: empire.transliteration,
        };
      });

      return preparedEmpires;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.empire.delete({ where: { id: input.id } });
    }),
  create: protectedProcedure
    .input(
      z.object({
        arabicName: z.string(),
        englishName: z.string(),
        transliteration: z.string().optional(),
        slug: z.string(),
        hijriStartYear: z.number().optional(),
        hijriEndYear: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.empire.create({
        data: {
          id: createId(),
          transliteration: input.transliteration,
          hijriStartYear: input.hijriStartYear,
          hijriEndYear: input.hijriEndYear,
          EmpireName: {
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
        hijriStartYear: z.number().optional(),
        hijriEndYear: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.usulDb.$transaction([
        ctx.usulDb.empire.update({
          where: { id: input.id },
          data: {
            transliteration: input.transliteration,
            slug: input.slug,
            hijriStartYear: input.hijriStartYear,
            hijriEndYear: input.hijriEndYear,
          },
        }),
        ctx.usulDb.empireName.updateMany({
          where: { empireId: input.id, locale: "ar" },
          data: {
            text: input.arabicName,
          },
        }),
        ctx.usulDb.empireName.updateMany({
          where: { empireId: input.id, locale: "en" },
          data: {
            text: input.englishName,
          },
        }),
      ]);
    }),
});
