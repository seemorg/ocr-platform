import { Queue } from "bullmq";

import { createRedis } from "./lib/redis";

export const BOOKS_QUEUE_NAME = "books_queue";
export const BOOKS_QUEUE_REDIS = createRedis();

export const booksQueue = new Queue<{ bookId: string }>(BOOKS_QUEUE_NAME, {
  connection: BOOKS_QUEUE_REDIS,
});
