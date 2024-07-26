import { Queue } from "bullmq";
import { redisOptions } from "./lib/redis";

export const BOOKS_QUEUE_NAME = "books_queue";

export const booksQueue = new Queue<{ bookId: string }>(BOOKS_QUEUE_NAME, {
  connection: redisOptions,
});
