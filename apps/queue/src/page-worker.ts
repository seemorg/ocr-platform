import { Worker } from "bullmq";

import { BookStatus, PageFlag, PageOcrStatus } from "@usul-ocr/db";

import type { PagesQueueData } from "./page-queue";
import { db } from "./lib/db";
import { PAGES_QUEUE_NAME, PAGES_QUEUE_REDIS } from "./page-queue";
import { executePipelineForPage } from "./pipeline";

export const pagesWorker = new Worker<PagesQueueData>(
  PAGES_QUEUE_NAME,
  async (job) => {
    const { bookId, pageIndex, pdfUrl } = job.data;

    let error;
    const result = await executePipelineForPage(pdfUrl, pageIndex).catch(
      (err) => {
        error = err;
        return null;
      },
    );

    if (error) {
      job.log(JSON.stringify(error, null, 2));
    }

    if (job.data.isRedo) {
      await db.page.update({
        where: { id: job.data.pageId },
        data: {
          ocrStatus: error ? PageOcrStatus.FAILED : PageOcrStatus.COMPLETED,
          ...(result
            ? result.error
              ? {
                  ocrContent: result.value,
                  flags: [PageFlag.NEEDS_ADDITIONAL_REVIEW],
                }
              : {
                  pageNumber:
                    typeof result.value.pageNumber === "number"
                      ? result.value.pageNumber
                      : null,
                  ocrContent: result.value.body,
                  ocrFootnotes: result.value.footnotes ?? null,
                }
            : {
                ocrContent: "",
                pageNumber: null,
                ocrFootnotes: null,
              }),
        },
      });

      return {};
    }

    await db.page.create({
      data: {
        book: {
          connect: {
            id: bookId,
          },
        },
        pdfPageNumber: pageIndex + 1,
        ocrStatus: error ? PageOcrStatus.FAILED : PageOcrStatus.COMPLETED,
        ...(result
          ? result.error
            ? {
                ocrContent: result.value,
                flags: [PageFlag.NEEDS_ADDITIONAL_REVIEW],
              }
            : {
                pageNumber:
                  typeof result.value.pageNumber === "number"
                    ? result.value.pageNumber
                    : null,
                ocrContent: result.value.body,
                ocrFootnotes: result.value.footnotes ?? null,
              }
          : {
              ocrContent: "",
              pageNumber: null,
              ocrFootnotes: null,
            }),
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
