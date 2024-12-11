import { db } from "@/lib/db";
import { ocrPageAsBuffer } from "@/lib/ocr";
import { uploadToR2 } from "@/lib/r2";
import { getBookPdfUrl } from "@/services/book";
import { Worker } from "bullmq";

import type { UploadQueueData } from "./queue";
import { UPLOAD_QUEUE_NAME, UPLOAD_QUEUE_REDIS } from "./queue";

export const uploadWorker = new Worker<UploadQueueData>(
  UPLOAD_QUEUE_NAME,
  async (job) => {
    const { pageId } = job.data;

    const page = await db.page.findUniqueOrThrow({
      where: { id: pageId },
      select: { id: true, bookId: true, pdfPageNumber: true },
    });

    const book = await getBookPdfUrl(page.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const pageImage = await ocrPageAsBuffer(
      book.pdfUrl,
      page.pdfPageNumber - 1,
    );

    if (!pageImage || !pageImage.imgBuffer) {
      throw new Error("Failed to get page image");
    }

    await db.azureOcrOutput.create({
      data: {
        page: {
          connect: {
            id: pageId,
          },
        },
        output: pageImage.text,
      },
    });

    // upload to r2
    await uploadToR2(`ocr-pages/${page.id}.png`, pageImage.imgBuffer, {
      contentType: "image/png",
    });

    return { success: true };
  },
  {
    connection: UPLOAD_QUEUE_REDIS,
    concurrency: 5,
    removeOnComplete: { count: 100 },
  },
);
