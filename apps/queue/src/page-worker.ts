import { Worker } from "bullmq";
import { redisOptions } from "./lib/redis";
import { PAGES_QUEUE_NAME } from "./page-queue";
import { pdfPipelineForPage } from "./lib/pipeline";
import { db } from "./lib/db";
import { BookStatus } from "@usul-ocr/db";

export const pagesWorker = new Worker<{
  bookId: string;
  pageIndex: number;
  pdfUrl: string;
  isLast?: boolean;
}>(
  PAGES_QUEUE_NAME,
  async (job) => {
    const { bookId, pageIndex, pdfUrl } = job.data;

    const result = await pdfPipelineForPage(pdfUrl, pageIndex);

    await db.page.create({
      data: {
        bookId,
        pdfPageNumber: pageIndex + 1,
        pageNumber:
          typeof result.pageNumber === "number" ? result.pageNumber : null,
        ocrContent: result.body,
        ocrFootnotes: result.footnotes ?? null,
        // volumeNumber: 1, // TODO: change later
      },
    });

    if (job.data.isLast) {
      await db.book.update({
        where: { id: bookId },
        data: { status: BookStatus.WAITING_FOR_REVIEW },
      });
    }

    return {};
  },
  { connection: redisOptions },
);
