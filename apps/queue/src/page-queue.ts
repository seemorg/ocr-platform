import { Queue } from "bullmq";

import { createRedis } from "./lib/redis";

export const PAGES_QUEUE_NAME = "pages_queue";
export const PAGES_QUEUE_REDIS = createRedis();

export type PagesQueueData =
  | {
      bookId: string;
      pageIndex: number;
      pdfUrl: string;
      isLast?: boolean;
      isRedo?: false;
    }
  | {
      pageId: string;
      bookId: string;
      pageIndex: number;
      pdfUrl: string;
      isRedo: true;
    };

export const pagesQueue = new Queue<PagesQueueData>(PAGES_QUEUE_NAME, {
  connection: PAGES_QUEUE_REDIS,
});
