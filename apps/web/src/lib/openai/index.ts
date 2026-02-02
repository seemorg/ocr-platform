import { env } from "@/env";
import { AzureOpenAI } from "openai";

export const openai = new AzureOpenAI({
  deployment: env.AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: "2024-10-21",
  endpoint: `https://${env.AZURE_OPENAI_RESOURCE_NAME}.cognitiveservices.azure.com/`,
  apiKey: env.AZURE_OPENAI_KEY,
});
