import {
  addAuthorToPipeline,
  addBookToPipeline,
  regenerateBook,
  regenerateBookCover,
} from "@/lib/usul-pipeline";
import {
  deleteBookById,
  getBookWithDetailsById,
} from "@/server/services/usul/book";
import {
  createBook,
  createBookSchema,
} from "@/server/services/usul/book/create";
import {
  updateBook,
  updateBookSchema,
} from "@/server/services/usul/book/update";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const usulBookRouter = createTRPCRouter({
  regenerateBookCover: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await regenerateBookCover({ id: input.id });
      return result;
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getBookWithDetailsById(input.id, ctx.usulDb);
    }),
  deleteBook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteBookById(input.id, ctx.usulDb);
      return { success: true };
    }),
  checkAirtableReference: protectedProcedure
    .input(
      z.object({
        airtableReference: z.string(),
        authorAirtableReference: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [book, author] = await Promise.all([
        ctx.usulDb.book.findFirst({
          where: {
            extraProperties: {
              path: ["_airtableReference"],
              equals: input.airtableReference,
            },
          },
          select: {
            id: true,
          },
        }),
        ctx.usulDb.author.findFirst({
          where: {
            extraProperties: {
              path: ["_airtableReference"],
              equals: input.authorAirtableReference,
            },
          },
          select: {
            id: true,
          },
        }),
      ]);

      return {
        bookExists: !!book,
        authorExists: !!author,
        bookId: book?.id,
        authorId: author?.id,
      };
    }),
  create: protectedProcedure
    .input(createBookSchema)
    .mutation(async ({ ctx, input }) => {
      const { book, newAuthor } = await createBook(input, ctx.usulDb);

      if (newAuthor) {
        await addAuthorToPipeline(newAuthor);
      }

      await addBookToPipeline({
        slug: book.slug,
        arabicName: book.arabicName,
        authorArabicName: book.authorArabicName,
      });

      return book;
    }),
  update: protectedProcedure
    .input(updateBookSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, didArabicNameChange, didAuthorChange } = await updateBook(
        input,
        ctx.usulDb,
      );

      await regenerateBook({
        id,
        regenerateNames: didArabicNameChange,
        regenerateCover: didArabicNameChange || didAuthorChange,
      });

      return { success: true };
    }),
});
