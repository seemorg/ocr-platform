import { createRedis } from "@/lib/redis";
import { Queue } from "bullmq";

export const BOOKS_QUEUE_NAME = "books_queue";
export const BOOKS_QUEUE_REDIS = createRedis();

export const booksQueue = new Queue<{ bookId: string }>(BOOKS_QUEUE_NAME, {
  connection: BOOKS_QUEUE_REDIS,
});
