import Redis from "ioredis";

import { env } from "../env";

export const createRedis = () =>
  new Redis({
    port: env.REDIS_PORT,
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD,
    username: env.REDIS_USERNAME,
    tls: {
      rejectUnauthorized: false,
    },
  });
