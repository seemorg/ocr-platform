import { getAirtableTexts, invalidateAirtableTexts } from "@/lib/airtable";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const airtableRouter = createTRPCRouter({
  getAirtableTexts: protectedProcedure.query(async () => {
    const airtableTexts = (await getAirtableTexts()).sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
    return airtableTexts;
  }),
  invalidateAirtableTexts: protectedProcedure.mutation(async () => {
    invalidateAirtableTexts();
  }),
});
