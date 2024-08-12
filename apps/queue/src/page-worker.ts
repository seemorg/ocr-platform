import { Worker } from "bullmq";
import { stripHtml } from "string-strip-html";

import { BookStatus, PageFlag, PageOcrStatus, Prisma } from "@usul-ocr/db";

import type { PagesQueueData } from "./page-queue";
import { db } from "./lib/db";
import { PAGES_QUEUE_NAME, PAGES_QUEUE_REDIS } from "./page-queue";
import { executePipelineForPage } from "./pipeline";

function countWords(text: string): number {
  const strippedText = stripHtml(text).result;

  const words = strippedText.trim().match(/[\p{L}\p{M}\p{N}]+/gu);
  return words ? words.length : 0;
}

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

    if (error || result?.error) {
      const errorBody = error ? error : result?.error ? result : null;
      await job.log(JSON.stringify({ error: errorBody }, null, 2));
    }

    const pageData: Prisma.PageUpdateInput = {
      ocrStatus: error ? PageOcrStatus.FAILED : PageOcrStatus.COMPLETED,
    };

    if (result) {
      if (result.error) {
        pageData.ocrContent = result.value ?? "";
        pageData.flags = [PageFlag.NEEDS_ADDITIONAL_REVIEW];
        pageData.totalWords = result.value ? countWords(result.value) : 0;
      } else {
        if (!result.value.body) {
          await job.log(JSON.stringify({ result }, null, 2));
        }

        pageData.pageNumber =
          typeof result.value.pageNumber === "number"
            ? result.value.pageNumber
            : null;
        pageData.ocrContent = result.value.body ?? "";
        pageData.ocrFootnotes = result.value.footnotes ?? null;
        pageData.totalWords =
          (result.value.body ? countWords(result.value.body) : 0) +
          (result.value.footnotes ? countWords(result.value.footnotes) : 0);
      }
    } else {
      pageData.ocrContent = "";
      pageData.pageNumber = null;
      pageData.ocrFootnotes = null;
      pageData.totalWords = 0;
    }

    if (job.data.isRedo) {
      await db.page.update({
        where: { id: job.data.pageId },
        data: pageData,
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
        ...(pageData as any),
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
