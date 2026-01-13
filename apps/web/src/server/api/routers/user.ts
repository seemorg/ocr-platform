import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "../trpc";

export const usersRouter = createTRPCRouter({
  searchUsers: adminProcedure
    .input(
      z.object({
        query: z.string().optional(),
        groupId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          GroupMembership: {
            none: {
              groupId: input.groupId,
            },
          },
          ...(input.query
            ? {
              email: {
                mode: "insensitive",
                contains: input.query,
              },
            }
            : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
      return users;
    }),
});
