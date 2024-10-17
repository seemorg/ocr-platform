import { transliterateText } from "@/lib/openai";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const openaiRouter = createTRPCRouter({
  transliterateText: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      return { result: await transliterateText(input.text) };
    }),
});
