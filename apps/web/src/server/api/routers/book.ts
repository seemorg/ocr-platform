import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { stripHtml } from "string-strip-html";
import { z } from "zod";

import type { Prisma } from "@usul-ocr/db";
import { BookStatus, PageFlag } from "@usul-ocr/db";

function countWords(text: string): number {
  const strippedText = stripHtml(text).result;

  const words = strippedText.trim().match(/[\p{L}\p{M}\p{N}]+/gu);
  return words ? words.length : 0;
}

export const bookRouter = createTRPCRouter({
  searchUnassignedBooks: protectedProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.book.findMany({
        where: {
          assignedGroup: null,
          ...(input.query
            ? {
                OR: [
                  {
                    arabicName: { mode: "insensitive", contains: input.query },
                  },
                  {
                    englishName: { mode: "insensitive", contains: input.query },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          arabicName: true,
        },
      });
    }),
  create: protectedProcedure
    .input(
      z.object({
        airtableId: z.string().optional(),
        pdfUrl: z.string().url(),
        arabicName: z.string().min(1),
        englishName: z.string().min(1).optional(),
        author: z.object({
          id: z.string().optional(),
          airtableId: z.string().optional(),
          arabicName: z.string().optional(),
          englishName: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // check if book already exists
      if (input.airtableId) {
        const book = await ctx.db.book.findFirst({
          where: { airtableId: input.airtableId },
          select: { id: true },
        });

        if (book) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Book already exists",
          });
        }
      }

      if (
        !input.author.id &&
        !input.author.arabicName &&
        !input.author.englishName
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Author is required",
        });
      }

      const existingAuthor = input.author.airtableId
        ? await ctx.db.author.findFirst({
            where: { airtableId: input.author.airtableId },
          })
        : null;

      const newBook = await ctx.db.book.create({
        data: {
          author: {
            ...(input.author.id || existingAuthor
              ? {
                  connect: {
                    id: (input.author.id || existingAuthor?.id) as string,
                  },
                }
              : {
                  create: {
                    arabicName: input.author.arabicName as string,
                    englishName: input.author.englishName,
                    airtableId: input.author.airtableId,
                  },
                }),
          },
          pdfUrl: input.pdfUrl,
          arabicName: input.arabicName,
          englishName: input.englishName,
          airtableId: input.airtableId,
        },
      });

      const response = await fetch(
        `${env.NEXT_PUBLIC_OCR_SERVER_URL}book/ocr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OCR_SERVER_API_KEY}`,
          },
          body: JSON.stringify({ bookId: newBook.id }),
        },
      );

      const data = (await response.json()) as { ok: boolean };

      return {
        book: newBook,
        ocrResponse: data,
      };
    }),
  updatePage: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        content: z.string().optional(),
        footnotesContent: z.string().optional(),
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
      }

      if (input.content || input.footnotesContent) {
        // recount words
        pageData.totalWords =
          (input.content ? countWords(input.content) : 0) +
          (input.footnotesContent ? countWords(input.footnotesContent) : 0);
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: pageData,
      });
    }),
  countWordsForBook: protectedProcedure
    .input(
      z.object({
        bookId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.page.aggregate({
        where: {
          book: {
            id: input.bookId,
          },
        },
        _sum: {
          totalWords: true,
        },
      });

      return result._sum.totalWords ?? 0;
    }),
});
