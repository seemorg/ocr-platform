import { env } from "../env";
import type { ConnectionOptions } from "bullmq";

export const redisOptions: ConnectionOptions = {
  port: env.REDIS_PORT,
  host: env.REDIS_HOST,
  password: env.REDIS_PASSWORD,
  username: env.REDIS_USERNAME,
  tls: {
    rejectUnauthorized: false,
  },
};
