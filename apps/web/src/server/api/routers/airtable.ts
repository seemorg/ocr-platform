import type { AirtableText } from "@/lib/airtable";
import {
  getAirtableAzhariTexts,
  getAirtableGeneralTexts,
  getAirtableHanafiTexts,
  getAirtableHasanWork,
  getAirtableIraqTexts,
  getAirtableIsmailTexts,
  getAirtableMalikiTexts,
  getAirtableShafiiTexts,
  invalidateAirtableTexts,
} from "@/lib/airtable";
import { airtableBases } from "@/lib/airtable/bases";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const baseToMethod: Record<
  (typeof airtableBases)[number],
  () => Promise<AirtableText[]>
> = {
  hanafi: getAirtableHanafiTexts,
  maliki: getAirtableMalikiTexts,
  shafii: getAirtableShafiiTexts,
  texts: getAirtableGeneralTexts,
  iraq: getAirtableIraqTexts,
  azhari: getAirtableAzhariTexts,
  "hasan-work": getAirtableHasanWork,
  "ismail-texts": getAirtableIsmailTexts,
};

export const airtableRouter = createTRPCRouter({
  getAirtableTexts: protectedProcedure
    .input(z.object({ base: z.enum(airtableBases) }))
    .query(async ({ input }) => {
      const airtableTexts = await baseToMethod[input.base]();
      return airtableTexts;
    }),
  invalidateAirtableTexts: protectedProcedure.mutation(async () => {
    invalidateAirtableTexts();
  }),
});
