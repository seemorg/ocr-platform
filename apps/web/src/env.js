import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    USUL_DATABASE_URL: z.string().url(),
    PRISMA_ADAPTER: z.enum(['neon', 'pg']).default('neon'),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    EMAIL_SERVER_USER: z.string(),
    EMAIL_SERVER_PASSWORD: z.string(),
    EMAIL_SERVER_HOST: z.string(),
    EMAIL_SERVER_PORT: z.string(),
    EMAIL_FROM: z.string(),
    OCR_SERVER_API_KEY: z.string(),
    AIRTABLE_API_TOKEN: z.string(),
    AIRTABLE_APP_ID: z.string(),
    R2_ENDPOINT: z.string().url(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_KEY: z.string(),
    R2_BUCKET: z.string(),
    R2_BUCKET_URL: z.string(),
    AZURE_OPENAI_DEPLOYMENT_NAME: z.string(),
    AZURE_OPENAI_KEY: z.string(),
    AZURE_OPENAI_RESOURCE_NAME: z.string(),
    USUL_PIPELINE_API_KEY: z.string(),
    USUL_PIPELINE_BASE_URL: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_OCR_SERVER_URL: z.string(),
    NEXT_PUBLIC_PARTYKIT_HOST: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    USUL_DATABASE_URL: process.env.USUL_DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_FROM: process.env.EMAIL_FROM,
    OCR_SERVER_API_KEY: process.env.OCR_SERVER_API_KEY,
    NEXT_PUBLIC_OCR_SERVER_URL: process.env.NEXT_PUBLIC_OCR_SERVER_URL,
    AIRTABLE_API_TOKEN: process.env.AIRTABLE_API_TOKEN,
    AIRTABLE_APP_ID: process.env.AIRTABLE_APP_ID,
    NEXT_PUBLIC_PARTYKIT_HOST: process.env.NEXT_PUBLIC_PARTYKIT_HOST,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_KEY: process.env.R2_SECRET_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_BUCKET_URL: process.env.R2_BUCKET_URL,
    AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_KEY: process.env.AZURE_OPENAI_KEY,
    AZURE_OPENAI_RESOURCE_NAME: process.env.AZURE_OPENAI_RESOURCE_NAME,
    USUL_PIPELINE_API_KEY: process.env.USUL_PIPELINE_API_KEY,
    USUL_PIPELINE_BASE_URL: process.env.USUL_PIPELINE_BASE_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
