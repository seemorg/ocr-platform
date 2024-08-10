import { env } from "@/env";
import { createPresignedUrl, doesObjectExists } from "@/lib/s3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const uploadsRouter = createTRPCRouter({
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const key = `pdfs/${input.fileName}`;

      // check if file exists
      const exists = await doesObjectExists(key);
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A file with the same name already exists",
        });
      }

      const url = await createPresignedUrl({
        key,
        contentType: "application/pdf",
      });

      const publicUrl = `${env.CLOUDFLARE_R2_BUCKET_URL}/${key}`;

      return {
        publicUrl,
        url,
      };
    }),
});
