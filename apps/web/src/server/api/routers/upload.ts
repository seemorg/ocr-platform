import { env } from "@/env";
import { createPresignedUrl, doesObjectExists } from "@/lib/s3";
import { TRPCError } from "@trpc/server";
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
      let key = `${PREFIX}${input.fileName.endsWith(".pdf") ? input.fileName : `${input.fileName}.pdf`}`;

      // check if file exists
      const exists = await doesObjectExists(key);
      if (exists) {
        // if the FE is passing a file name that ends with .pdf, then we can assume that it's a conflict
        if (input.fileName.endsWith(".pdf")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A file with the same name already exists",
          });
        }

        // otherwise, keep regenerating the key until it doesn't exist
        let increment = 1;
        let key = `${PREFIX}${input.fileName}-${increment}.pdf`;
        while (await doesObjectExists(key)) {
          increment++;
          key = `${PREFIX}${input.fileName}-${increment}.pdf`;
        }
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
