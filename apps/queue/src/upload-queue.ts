import { Queue } from "bullmq";

import { createRedis } from "./lib/redis";

export const UPLOAD_QUEUE_NAME = "upload_queue";
export const UPLOAD_QUEUE_REDIS = createRedis();

export interface UploadQueueData {
  pageId: string;
}

export const uploadQueue = new Queue<UploadQueueData>(UPLOAD_QUEUE_NAME, {
  connection: UPLOAD_QUEUE_REDIS,
});
