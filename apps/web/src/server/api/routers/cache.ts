import {
  getTypesenseStatus,
  purgeCloudflareCache,
  reIndexTypesense,
} from "@/lib/usul-pipeline";

import { adminProcedure, createTRPCRouter } from "../trpc";

export const cacheRouter = createTRPCRouter({
  reIndexTypesense: adminProcedure.mutation(async () => {
    return reIndexTypesense();
  }),
  getTypesenseStatus: adminProcedure.query(async () => {
    return getTypesenseStatus();
  }),
  purgeCloudflare: adminProcedure.mutation(async () => {
    return purgeCloudflareCache();
  }),
});
