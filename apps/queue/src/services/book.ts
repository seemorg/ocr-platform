import { db } from "@/lib/db";
import { LRUCache } from "lru-cache";

const bookIdToPdfUrlCache = new LRUCache<
  string,
  { pdfUrl: string; totalPages: number }
>({
  max: 1000, // Maximum number of items to store in the cache
});

export const getBookPdfUrl = async (bookId: string) => {
  if (bookIdToPdfUrlCache.has(bookId)) {
    return bookIdToPdfUrlCache.get(bookId)!;
  }

  const book = await db.book.findUnique({
    where: {
      id: bookId,
    },
  });
  if (!book) return null;

  const value = { pdfUrl: book.pdfUrl, totalPages: book.totalPages };
  bookIdToPdfUrlCache.set(bookId, value);
  return value;
};
