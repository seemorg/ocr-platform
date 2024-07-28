import { Queue } from "bullmq";

import { createRedis } from "./lib/redis";

export const PAGES_QUEUE_NAME = "pages_queue";
export const PAGES_QUEUE_REDIS = createRedis();

export const pagesQueue = new Queue<{
  bookId: string;
  pageIndex: number;
  pdfUrl: string;
  isLast?: boolean;
}>(PAGES_QUEUE_NAME, {
  connection: PAGES_QUEUE_REDIS,
});
