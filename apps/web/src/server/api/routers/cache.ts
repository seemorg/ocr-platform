import {
  getTypesenseStatus,
  purgeCloudflareCache,
  reIndexTypesense,
} from "@/lib/usul-pipeline";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "../trpc";

export const cacheRouter = createTRPCRouter({
  reIndexTypesense: adminProcedure
    .input(
      z.object({
        clearCloudflareCache: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return reIndexTypesense({
        clearCloudflareCache: input.clearCloudflareCache,
      });
    }),
  getTypesenseStatus: adminProcedure.query(async () => {
    return getTypesenseStatus();
  }),
  purgeCloudflare: adminProcedure.mutation(async () => {
    return purgeCloudflareCache();
  }),
});
