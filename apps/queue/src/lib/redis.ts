import Redis from "ioredis";

import { env } from "../env";

export const createRedis = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    tls: {
      rejectUnauthorized: false,
    },
    connectTimeout: 10000,
    keepAlive: 30000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
