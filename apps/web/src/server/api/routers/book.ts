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
          Group: null,
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
        usulBookId: z.string(),
        pdfUrl: z.string().url().startsWith("https://assets.usul.ai/pdfs/"),
        groupId: z.string().optional(),
        arabicName: z.string().optional(),
        englishName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // check if book already exists
      const book = await ctx.db.book.findUnique({
        where: {
          usulBookId_pdfUrl: {
            usulBookId: input.usulBookId,
            pdfUrl: input.pdfUrl,
          },
        },
        select: { id: true },
      });

      if (book) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Book already exists",
        });
      }

      const usulBook = await ctx.usulDb.book.findUnique({
        where: { id: input.usulBookId },
        select: { id: true, versions: true },
      });

      if (!usulBook) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Usul book not found",
        });
      }

      const versionIndex = usulBook.versions.findIndex(
        (v) => v.source === "pdf" && v.value === input.pdfUrl,
      );
      if (versionIndex === -1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Usul book version not found",
        });
      }

      const versionToAdd = usulBook.versions[versionIndex]! as Extract<
        PrismaJson.BookVersion,
        { source: "pdf" }
      >;

      if (versionToAdd.ocrBookId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Book version already has an OCR book id",
        });
      }

      const newBook = await ctx.db.book.create({
        data: {
          usulBookId: input.usulBookId,
          pdfUrl: input.pdfUrl,
          arabicName: input.arabicName,
          englishName: input.englishName,
          ...(versionToAdd.splitsData
            ? { splitsData: versionToAdd.splitsData }
            : {}),
          ...(input.groupId
            ? {
              Group: {
                connect: {
                  id: input.groupId,
                },
              },
            }
            : {}),
        },
      });

      const newVersions = structuredClone(usulBook.versions);
      (
        newVersions[versionIndex]! as Extract<
          PrismaJson.BookVersion,
          { source: "pdf" }
        >
      ).ocrBookId = newBook.id;

      try {
        // update the book version with the ocr book id
        await ctx.usulDb.book.update({
          where: { id: usulBook.id },
          data: { versions: newVersions },
        });
      } catch (e) { }

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
          Book: {
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
