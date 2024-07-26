import { Worker } from "bullmq";
import { BOOKS_QUEUE_NAME } from "./book-queue";
import { redisOptions } from "./lib/redis";
import { db } from "./lib/db";
import { getPdfPages } from "./lib/ocr";
import { pagesQueue } from "./page-queue";
import { chunk } from "./lib/utils";
import { BookStatus } from "@usul-ocr/db";

export const worker = new Worker<{ bookId: string }>(
  BOOKS_QUEUE_NAME,
  async (job) => {
    const { bookId } = job.data;
    const book = await db.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const pages = await getPdfPages(book.pdfUrl);
    const indices = new Array(pages).fill(null).map((_, i) => i);
    const chunks = chunk(indices, 10);

    for (const batch of chunks) {
      await pagesQueue.addBulk(
        batch.map((pageIndex) => ({
          name: `${book.id}-page-${pageIndex}`,
          data: {
            bookId,
            pageIndex,
            pdfUrl: book.pdfUrl,
            isLast: pageIndex === indices.length - 1 ? true : undefined,
          },
        })),
      );
    }

    await db.book.update({
      where: { id: book.id },
      data: {
        totalPages: pages,
        status: BookStatus.PROCESSING,
      },
    });

    return { totalPages: pages };
  },
  { connection: redisOptions },
);
