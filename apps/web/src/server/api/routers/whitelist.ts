import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const whitelistRouter = createTRPCRouter({
  add: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          role: true,
        },
      });

      if (user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      await ctx.db.userWhitelist.create({
        data: input,
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          role: true,
        },
      });

      if (user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      await ctx.db.userWhitelist.delete({
        where: {
          email: input.email,
        },
      });
    }),
});
