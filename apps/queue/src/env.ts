import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  isServer: true,
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    AZURE_OCR_ENDPOINT: z.string(),
    AZURE_OCR_KEY: z.string(),
    AZURE_OPENAI_DEPLOYMENT_NAME: z.string(),
    AZURE_OPENAI_KEY: z.string(),
    AZURE_OPENAI_RESOURCE_NAME: z.string(),
    REDIS_URL: z.string(),
    HELICONE_API_KEY: z.string(),
    DISABLE_HELICONE: z.coerce.boolean().optional().default(false),
    DASHBOARD_USERNAME: z.string(),
    DASHBOARD_PASSWORD: z.string(),
    OCR_SERVER_API_KEY: z.string(),
    ANTHROPIC_API_KEY: z.string(),
    R2_ENDPOINT: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_KEY: z.string(),
    R2_BUCKET: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
