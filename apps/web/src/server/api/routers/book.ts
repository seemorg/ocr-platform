import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { env } from "@/env";

export const bookRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        arabicName: z.string().min(1),
        englishName: z.string().min(1),
        pdfUrl: z.string().min(1),
        authorId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const book = await ctx.db.book.create({
        data: {
          arabicName: input.arabicName,
          englishName: input.englishName,
          author: {
            connect: {
              id: input.authorId,
            },
          },
          pdfUrl: input.pdfUrl,
        },
      });

      const response = await fetch(`${env.OCR_SERVER_URL}/book/ocr`, {
        method: "POST",
        body: JSON.stringify({ bookId: book.id }),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await response.json();

      return {
        book,
        ocrResponse: data as { ok: boolean },
      };
    }),
});
