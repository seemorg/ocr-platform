import { env } from "@/env";
import { createPresignedUrl, doesObjectExists } from "@/lib/s3";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const PREFIX = "pdfs/";

export const uploadsRouter = createTRPCRouter({
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const fileName = input.fileName;
      let key: string;

      // if the FE is passing a file name that ends with .pdf, then we can assume that it's a conflict
      if (fileName.endsWith(".pdf")) {
        // check if file exists
        const exists = await doesObjectExists(`${PREFIX}${fileName}`);
        if (exists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A file with the same name already exists",
          });
        }

        key = fileName;
      } else {
        key = `${fileName}-${nanoid(10)}.pdf`;
      }

      const finalKey = `${PREFIX}${key}`;
      const url = await createPresignedUrl({
        key: finalKey,
        contentType: "application/pdf",
      });

      const publicUrl = `${env.CLOUDFLARE_R2_BUCKET_URL}/${finalKey}`;

      return {
        publicUrl,
        url,
      };
    }),
});
