import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const bookRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        pdfUrl: z.string().url(),
        authorId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const book = await ctx.db.book.create({
        data: {
          author: {
            connect: {
              id: input.authorId,
            },
          },
          pdfUrl: input.pdfUrl,
        },
      });

      const response = await fetch(
        `${env.NEXT_PUBLIC_OCR_SERVER_URL}book/ocr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OCR_SERVER_API_KEY}`,
          },
          body: JSON.stringify({ bookId: book.id }),
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
