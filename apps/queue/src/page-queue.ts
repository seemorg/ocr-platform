import { Queue } from "bullmq";

import { redisOptions } from "./lib/redis";

export const PAGES_QUEUE_NAME = "pages_queue";

export const pagesQueue = new Queue<{
  bookId: string;
  pageIndex: number;
  pdfUrl: string;
  isLast?: boolean;
}>(PAGES_QUEUE_NAME, {
  connection: redisOptions,
});
