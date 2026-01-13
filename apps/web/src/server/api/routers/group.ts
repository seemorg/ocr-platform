import type { inferRouterContext } from "@trpc/server";
import { clearUserCache } from "@/server/services/user";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { GroupRole, Prisma, UserRole } from "@usul-ocr/db";

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

  if (
    membership &&
    (!requiredRole || (requiredRole && membership.role === requiredRole))
  ) {
    return membership;
  }

  // not a group member, so check if user is admin
  const user = await ctx.db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!user || user.role !== UserRole.ADMIN) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to add members to this group",
    });
  }

  return null;
};

export const groupRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.group.findMany({
        where: {
          name: {
            mode: "insensitive",
            contains: input.query,
          },
        },
      });
    }),
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.groupMembership.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        role: true,
        Group: true,
      },
    });

    return memberships;
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.create({
        data: {
          name: input.name,
          GroupMembership: {
            create: {
              userId: ctx.session.user.id,
              role: GroupRole.ADMIN,
            },
          },
        },
      });

      clearUserCache(ctx.session.user.id);

      return group;
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
          Book: {
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
          GroupMembership: {
            select: {
              role: true,
              createdAt: true,
              User: {
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
        select: {
          id: true,
          name: true,
          createdAt: true,
          Book: {
            select: {
              id: true,
              arabicName: true,
              englishName: true,
              totalPages: true,
              reviewedPages: true,
              status: true,
              createdAt: true,
            },
          },
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

        clearUserCache(membership.userId);

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

      const deleted = await ctx.db.groupMembership.delete({
        where: {
          id: membership.id,
        },
      });

      clearUserCache(deleted.userId);

      return deleted;
    }),
});
