import { extractPublishingDetails } from "@/lib/openai/extract-publishing-details";
import { transliterateText } from "@/lib/openai/transliterate";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const openaiRouter = createTRPCRouter({
  transliterateText: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      return { result: await transliterateText(input.text) };
    }),
  extractPublishingDetails: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      return { result: await extractPublishingDetails(input.text) };
    }),
});
