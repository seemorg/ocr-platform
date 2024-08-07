import { env } from "@/env";
import Anthropic from "@anthropic-ai/sdk";
import {
  TextBlock,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages.mjs";
import {
  ChatMessageImageContentItem,
  ChatMessageTextContentItem,
  ChatRequestSystemMessage,
  ChatRequestUserMessage,
} from "@azure/openai";

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export const getChatCompletions = async (
  params: (ChatRequestSystemMessage | ChatRequestUserMessage)[],
  extraOptions?: {
    jsonSchema?: JsonSchema;
  },
): Promise<string | null> => {
  const systemPrompt = params[0]?.role === "system" ? params[0]?.content : null;
  const messages = systemPrompt ? params.slice(1) : params;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 3000,
    tools: extraOptions?.jsonSchema ? [extraOptions.jsonSchema] : undefined,
    tool_choice: extraOptions?.jsonSchema
      ? {
          type: "tool",
          name: extraOptions.jsonSchema.name,
        }
      : undefined,
    system: systemPrompt ?? undefined,
    messages: messages.map((message) => ({
      role: message.role === "system" ? "assistant" : "user",
      content:
        typeof message.content === "string"
          ? message.content
          : message.content.map((block) => {
              const isImage = block.type === "image_url";

              if (!isImage) {
                return {
                  type: "text",
                  text: (block as ChatMessageTextContentItem).text,
                };
              }

              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: (
                    block as ChatMessageImageContentItem
                  ).imageUrl.url.replace("data:image/png;base64,", ""),
                },
              };
            }),
    })),
  });

  const content = response.content[0];

  if (!content) return null;

  // TODO: improve types for this case
  if (extraOptions?.jsonSchema)
    return ((content as ToolUseBlock).input as string) ?? null;

  return (content as TextBlock).text ?? null;
};

type PropSchema =
  | {
      type: "object";
      properties: Record<string, PropSchema>;
      required: string[];
    }
  | {
      type: "string";
      description?: string;
    }
  | {
      type: "number";
      description?: string;
    }
  | {
      type: "integer";
      description?: string;
    }
  | {
      type: "array";
      items: PropSchema;
      description?: string;
    };

export type JsonSchema = {
  name: string;
  description?: string;
  input_schema: {
    type: "object";
    properties: Record<string, PropSchema>;
    required: string[];
  };
};
