import { env } from "@/env";
import { countPageWords } from "@/lib/page";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "@usul-ocr/db";
import { BookStatus, PageFlag, UserRole } from "@usul-ocr/db";

import { getUserGroupIdsAndRole } from "../../services/user";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pageRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        bookId: z.string(),
        pageNumber: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await getUserGroupIdsAndRole(ctx.session.user.id);

      // get the first page that needs review
      const page = await ctx.db.page.findFirst({
        where: {
          pdfPageNumber: input.pageNumber,
          book: {
            id: input.bookId,
            ...(user?.role === UserRole.ADMIN
              ? {}
              : {
                  assignedGroup: {
                    id: {
                      in: user?.groupIds,
                    },
                  },
                }),
          },
        },
        include: {
          book: true,
          reviewedBy: { select: { email: true } },
        },
      });

      if (!page || !page.book)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });

      return page;
    }),
  update: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        content: z.string().optional(),
        footnotesContent: z.string().optional(),
        editorialNotesContent: z.string().optional(),
        pageNumber: z.number().optional(),
        flags: z
          .array(z.enum([PageFlag.EMPTY]))
          .min(1)
          .optional(),
        redoOcr: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        select: {
          id: true,
          reviewed: true,
          flags: true,
          book: {
            select: {
              status: true,
              totalPages: true,
              reviewedPages: true,
            },
          },
        },
      });

      if (!page) {
        throw new Error("Page not found");
      }

      if (input.redoOcr) {
        const response = await fetch(
          `${env.NEXT_PUBLIC_OCR_SERVER_URL}page/${page.id}/ocr`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.OCR_SERVER_API_KEY}`,
            },
          },
        );

        const data = (await response.json()) as { ok: boolean };
        return data;
      }

      let pageData: Prisma.PageUpdateInput = {
        reviewed: true,
        reviewedAt: new Date(),
        reviewedBy: {
          connect: {
            id: ctx.session.user.id,
          },
        },
        ...(!page.reviewed
          ? {
              book: {
                update: {
                  reviewedPages: {
                    increment: 1,
                  },
                  ...(page.book.totalPages === page.book.reviewedPages + 1 &&
                  page.book.status !== "COMPLETED"
                    ? {
                        status: BookStatus.COMPLETED,
                      }
                    : {}),
                },
              },
            }
          : {}),
      };

      if (input.flags) {
        pageData.flags = [...new Set(page.flags.concat(input.flags))];
      } else {
        if (input.content) pageData.content = input.content;
        if (input.footnotesContent) pageData.footnotes = input.footnotesContent;
        if (input.pageNumber) pageData.pageNumber = input.pageNumber;
        if (input.editorialNotesContent)
          pageData.editorialNotes = input.editorialNotesContent;
      }

      if (input.content || input.footnotesContent) {
        // recount words
        pageData.totalWords = countPageWords({
          content: input.content,
          footnotes: input.footnotesContent,
        });
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: pageData,
      });
    }),
});
