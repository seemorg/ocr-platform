import { env } from "@/env";
import { AzureOpenAI } from "openai";
import { z } from "zod";

export const openai = new AzureOpenAI({
  deployment: env.AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: "2024-08-01-preview",
  endpoint: `https://${env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/`,
  apiKey: env.AZURE_OPENAI_KEY,
});

const SYSTEM_PROMPT = `
You are an assistant that helps Islamic researchers. You take arabic text as input, and return a json with the english transliteration in IJMES format.
  
The schema should match the following: 
{
  "transliteration": String
}
`.trim();

const schema = z.object({
  transliteration: z.string(),
});

export const transliterateText = async (
  text: string,
): Promise<string | null> => {
  try {
    const completion = await openai.chat.completions.create({
      model: "",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `"${text}"` },
      ],
    });

    const result = completion.choices[0]?.message.content;
    if (!result) return null;

    const parsedResult = schema.safeParse(JSON.parse(result));
    if (!parsedResult.success) return null;

    return parsedResult.data.transliteration
      .replace(/ʻ/g, "ʿ")
      .replace(/'/g, "ʾ");
  } catch (e: any) {
    return null;
  }
};
