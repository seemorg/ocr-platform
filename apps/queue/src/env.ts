import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  isServer: true,
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
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
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: process.env,

  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
