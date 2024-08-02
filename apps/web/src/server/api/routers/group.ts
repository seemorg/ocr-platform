import type { inferRouterContext } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { GroupRole, Prisma } from "@usul-ocr/db";

import { type AppRouter } from "../root";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "../trpc";

const validateAdminOrGroupMember = async (
  ctx: inferRouterContext<AppRouter>,
  groupId: string,
  requiredRole?: GroupRole,
) => {
  const session = ctx.session!;
  const membership = await ctx.db.groupMembership.findFirst({
    where: {
      groupId: groupId,
      userId: session.user.id,
    },
  });

  if (membership) {
    if (requiredRole && membership.role !== requiredRole) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to add members to this group",
      });
    }

    return membership;
  } else {
    const user = await ctx.db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        role: true,
      },
    });

    if (!user || user.role !== GroupRole.ADMIN) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to add members to this group",
      });
    }

    return null;
  }
};

export const groupRouter = createTRPCRouter({
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.groupMembership.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        role: true,
        group: true,
      },
    });

    return memberships;
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.create({
        data: {
          name: input.name,
          groupMemberships: {
            create: {
              userId: ctx.session.user.id,
              role: GroupRole.ADMIN,
            },
          },
        },
      });
    }),
  assignBook: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
        bookId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.update({
        where: {
          id: input.groupId,
        },
        data: {
          assignedBooks: {
            connect: {
              id: input.bookId,
            },
          },
        },
      });
    }),
  getWithMembers: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await validateAdminOrGroupMember(ctx, input.groupId);

      return ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
        select: {
          id: true,
          name: true,
          groupMemberships: {
            select: {
              role: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    }),
  getWithBooks: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await validateAdminOrGroupMember(ctx, input.groupId);

      return ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
        include: {
          assignedBooks: true,
        },
      });
    }),
  addMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // make sure user.ctx is admin or a group admin
      await validateAdminOrGroupMember(ctx, input.groupId, GroupRole.ADMIN);

      const user = await ctx.db.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      try {
        const membership = await ctx.db.groupMembership.create({
          data: {
            userId: user.id,
            groupId: input.groupId,
            role: GroupRole.MEMBER,
          },
        });

        return membership;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this group",
          });
        }

        throw error;
      }
    }),
  removeMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await validateAdminOrGroupMember(ctx, input.groupId, GroupRole.ADMIN);

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from a group",
        });
      }

      const membership = await ctx.db.groupMembership.findFirst({
        where: {
          groupId: input.groupId,
          userId: input.userId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this group",
        });
      }

      if (membership.role === GroupRole.ADMIN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove an admin from a group",
        });
      }

      return ctx.db.groupMembership.delete({
        where: {
          id: membership.id,
        },
      });
    }),
});
