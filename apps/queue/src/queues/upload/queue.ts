import { createRedis } from "@/lib/redis";
import { Queue } from "bullmq";

// A queue to handle preparing data for the fine-tuning process
// it basically uploads all pages to r2 and transcribes them using azure,
// and then stores the output in the database
export const UPLOAD_QUEUE_NAME = "upload_queue";
export const UPLOAD_QUEUE_REDIS = createRedis();

export interface UploadQueueData {
  pageId: string;
}

export const uploadQueue = new Queue<UploadQueueData>(UPLOAD_QUEUE_NAME, {
  connection: UPLOAD_QUEUE_REDIS,
});
