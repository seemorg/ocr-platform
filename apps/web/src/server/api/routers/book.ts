import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "@usul-ocr/db";
import { PageFlag } from "@usul-ocr/db";

export const bookRouter = createTRPCRouter({
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
          arabicName: z.string().min(1),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const author = await ctx.db.author.findFirst({
        where: { airtableId: input.author.airtableId },
      });

      // check if book already exists
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

      const newBook = await ctx.db.book.create({
        data: {
          author: {
            ...(author
              ? {
                  connect: {
                    id: author.id,
                  },
                }
              : {
                  create: {
                    arabicName: input.author.arabicName,
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
        book,
        ocrResponse: data,
      };
    }),
  updatePage: protectedProcedure
    .input(
      z
        .object({
          pageId: z.string().min(1),
          content: z.string().optional(),
          footnotesContent: z.string().optional(),
          pageNumber: z.number().optional(),
        })
        .or(
          z.object({
            pageId: z.string().min(1),
            flags: z.array(z.enum([PageFlag.EMPTY])).min(1),
          }),
        )
        .or(
          z.object({
            pageId: z.string().min(1),
            redoOcr: z.literal(true),
          }),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        select: { id: true, reviewed: true, flags: true },
      });

      if (!page) {
        throw new Error("Page not found");
      }

      if ("redoOcr" in input) {
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
                },
              },
            }
          : {}),
      };

      if ("flags" in input) {
        pageData.flags = [...new Set(page.flags.concat(input.flags))];
      } else {
        if (input.content) pageData.content = input.content;
        if (input.footnotesContent) pageData.footnotes = input.footnotesContent;
        if (input.pageNumber) pageData.pageNumber = input.pageNumber;
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: pageData,
      });
    }),
});
