import type {
  ChatMessageImageContentItem,
  ChatMessageTextContentItem,
  ChatRequestSystemMessage,
  ChatRequestUserMessage,
} from "@azure/openai";
import { AzureKeyCredential, OpenAIClient } from "@azure/openai";
import OpenAI from "openai";
import { ChatCompletionSystemMessageParam } from "openai/resources/index.mjs";
import { ChatCompletionUserMessageParam } from "openai/src/resources/index.js";

import { env } from "../env";

const azureOpenai = new OpenAIClient(
  `https://${env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/`,
  new AzureKeyCredential(env.AZURE_OPENAI_KEY),
);

const heliconeOpenai = new OpenAI({
  apiKey: env.AZURE_OPENAI_KEY,
  baseURL: `https://oai.helicone.ai/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${env.HELICONE_API_KEY}`,
    "Helicone-OpenAI-API-Base": `https://${env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/`,
    "Helicone-Property-App": "ocr-pipeline",
    "Api-Key": env.AZURE_OPENAI_KEY,
  },
  defaultQuery: { "api-version": "2024-04-01-preview" },
});

export const getChatCompletions = async (
  params: (ChatRequestSystemMessage | ChatRequestUserMessage)[],
  extraOptions?: {
    temperature?: number;
    responseFormat?: {
      type: "json_object" | "text";
    };
  },
): Promise<string | null> => {
  if (env.DISABLE_HELICONE) {
    const response = await azureOpenai.getChatCompletions(
      env.AZURE_OPENAI_DEPLOYMENT_NAME,
      params,
      extraOptions,
    );
    return response.choices[0]?.message?.content ?? null;
  }

  const response = await heliconeOpenai.chat.completions.create({
    model: "gpt-4o",
    temperature: extraOptions?.temperature,
    response_format: extraOptions?.responseFormat?.type
      ? { type: extraOptions?.responseFormat?.type }
      : undefined,
    messages: params.map((message) => {
      return {
        role: message.role,
        name: message.name,
        content:
          typeof message.content === "string"
            ? message.content
            : message.content.map((item) => {
                if (item.type === "image_url") {
                  const typedItem = item as ChatMessageImageContentItem;
                  return {
                    type: "image_url",
                    image_url: {
                      url: typedItem.imageUrl.url,
                    },
                  };
                }

                const typedItem = item as ChatMessageTextContentItem;
                return {
                  type: "text",
                  text: typedItem.text,
                };
              }),
      } as ChatCompletionSystemMessageParam | ChatCompletionUserMessageParam;
    }),
  });

  return response.choices[0]?.message.content ?? null;
};
