import type { JsonSchema } from "../lib/anthropic";
import { PipelineMode, PipelinePage } from "../types/pipeline";
import { getCallerByMode, isOpenAIContentPolicyError } from "./utils";

const Schema: JsonSchema = {
  name: "segment_ocr",
  input_schema: {
    type: "object",
    properties: {
      header: {
        type: "string",
      },
      body: {
        type: "string",
      },
      footnotes: {
        type: "string",
      },
      pageNumber: {
        type: "integer",
      },
    },
    required: ["body", "pageNumber"],
  },
};

const parseResponse = (json: string) => {
  try {
    return JSON.parse(json) as {
      header: string | null;
      body: string;
      footnotes: string | null;
      pageNumber: number;
    };
  } catch (e) {
    return null;
  }
};

export const segmentOcrResponse = async (
  page: PipelinePage,
  mode: PipelineMode = "azure",
) => {
  const caller = getCallerByMode(mode);

  try {
    const response = await caller(
      [
        {
          role: "system",
          content: `
        Given the following output of an OCR system and image it was generated from. Segment the content into a header (optional), body, footnotes (optional), and page number. Make sure to preserve the html formatting of the text and do not modify it. The output should match the following json format: 
        {
          header: String | null,
          body: String,
          footnotes: String | null,
          pageNumber: Number
        }.
        
        DO NOT modify the content or formatting, just segment them into different sections. if a section is empty or not applicable make the value \`null\`
                    `.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              imageUrl: {
                url: `data:image/png;base64,${page.imageBase64}`,
              },
            },
            {
              type: "text",
              text: page.text,
            },
          ],
        },
      ],
      {
        temperature: 0,
        ...(mode === "azure"
          ? {
              responseFormat: { type: "json_object" },
            }
          : {
              jsonSchema: Schema,
            }),
      },
    );

    if (!response) return null;

    return mode === "azure"
      ? parseResponse(response)
      : (response as unknown as ReturnType<typeof parseResponse>);
  } catch (e) {
    if (isOpenAIContentPolicyError(e)) return null;
    throw e;
  }
};
