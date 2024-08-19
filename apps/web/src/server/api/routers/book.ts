import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
        groupId: z.string().optional(),
        splitsData: z
          .object({
            splits: z.array(
              z.object({
                start: z.number(),
                end: z.number(),
              }),
            ),
          })
          .optional(),
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
          splitsData: input.splitsData,
          ...(input.groupId
            ? {
                assignedGroup: {
                  connect: {
                    id: input.groupId,
                  },
                },
              }
            : {}),
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
  countWords: protectedProcedure
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
