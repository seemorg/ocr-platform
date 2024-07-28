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
});
