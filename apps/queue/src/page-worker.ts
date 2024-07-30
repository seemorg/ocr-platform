import { Worker } from "bullmq";

import { BookStatus } from "@usul-ocr/db";

import { db } from "./lib/db";
import { pdfPipelineForPage } from "./lib/pipeline";
import { PAGES_QUEUE_NAME, PAGES_QUEUE_REDIS } from "./page-queue";

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
        data: { status: BookStatus.IN_REVIEW },
      });
    }

    return {};
  },
  {
    connection: PAGES_QUEUE_REDIS,
    concurrency: 10,
    removeOnComplete: {
      age: 3600 * 24 * 5, // keep up to 5 days
    },
  },
);
