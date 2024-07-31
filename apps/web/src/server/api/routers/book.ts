import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const bookRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        pdfUrl: z.string().url(),
        arabicName: z.string().min(1),
        englishName: z.string().min(1).optional(),
        airtableId: z.string().min(1),
        author: z.object({
          airtableId: z.string().min(1),
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
      z.object({
        pageId: z.string().min(1),
        content: z.string().optional(),
        footnotesContent: z.string().optional(),
        pageNumber: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        select: { reviewed: true },
      });

      if (!page) {
        throw new Error("Page not found");
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: {
          ...(page.reviewed
            ? {}
            : {
                reviewed: true,
                reviewedAt: new Date(),
                reviewedBy: {
                  connect: {
                    id: ctx.session.user.id,
                  },
                },
                book: {
                  update: {
                    reviewedPages: {
                      increment: 1,
                    },
                  },
                },
              }),
          ...(input.content && {
            content: input.content,
          }),
          ...(input.footnotesContent && {
            footnotes: input.footnotesContent,
          }),
          ...(input.pageNumber && {
            pageNumber: input.pageNumber,
          }),
        },
      });
    }),
});
