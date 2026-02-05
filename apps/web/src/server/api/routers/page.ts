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
          Book: {
            id: input.bookId,
            ...(user?.role === UserRole.ADMIN
              ? {}
              : {
                Group: {
                  id: {
                    in: user?.groupIds,
                  },
                },
              }),
          },
        },
        select: {
          id: true,
          pageNumber: true,
          volumeNumber: true,
          pdfPageNumber: true,
          content: true,
          footnotes: true,
          bookId: true,
          reviewed: true,
          reviewedAt: true,
          reviewedById: true,
          ocrContent: true,
          ocrFootnotes: true,
          flags: true,
          ocrStatus: true,
          totalWords: true,
          editorialNotes: true,
          Book: {
            select: {
              id: true,
              arabicName: true,
              englishName: true,
              totalPages: true,
              reviewedPages: true,
              status: true,
            },
          },
          User: { select: { email: true } },
        },
      });

      if (!page || !page.Book)
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
          Book: {
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
        // Ensure URL doesn't have double slashes
        const baseUrl = env.NEXT_PUBLIC_OCR_SERVER_URL.endsWith("/")
          ? env.NEXT_PUBLIC_OCR_SERVER_URL.slice(0, -1)
          : env.NEXT_PUBLIC_OCR_SERVER_URL;
        const url = `${baseUrl}/page/${page.id}/ocr`;

        let response: Response;
        try {
          response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.OCR_SERVER_API_KEY}`,
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to connect to OCR server at ${baseUrl}. Make sure the OCR server is running. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `OCR server error: ${response.status} ${response.statusText}. ${errorText}. URL: ${url}`,
          });
        }

        let data: { ok: boolean };
        try {
          const text = await response.text();
          data = JSON.parse(text) as { ok: boolean };
        } catch (error) {
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: `Failed to parse OCR server response: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }

        return data;
      }

      let pageData: Prisma.PageUpdateInput = {
        reviewed: true,
        reviewedAt: new Date(),
        User: {
          connect: {
            id: ctx.session.user.id,
          },
        },
        ...(!page.reviewed
          ? {
            Book: {
              update: {
                reviewedPages: {
                  increment: 1,
                },
                ...(page.Book.totalPages === page.Book.reviewedPages + 1 &&
                  page.Book.status !== "COMPLETED"
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
        if (input.editorialNotesContent) pageData.editorialNotes = input.editorialNotesContent;
        if (input.pageNumber) pageData.pageNumber = input.pageNumber;
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
