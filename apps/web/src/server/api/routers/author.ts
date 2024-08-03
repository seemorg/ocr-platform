import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const authorsRouter = createTRPCRouter({
  searchAuthors: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const authors = await ctx.db.author.findMany({
        where: {
          ...(input.query
            ? {
                OR: [
                  {
                    arabicName: {
                      mode: "insensitive",
                      contains: input.query,
                    },
                  },
                  {
                    englishName: {
                      mode: "insensitive",
                      contains: input.query,
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          arabicName: true,
          englishName: true,
        },
      });
      return authors;
    }),
});
