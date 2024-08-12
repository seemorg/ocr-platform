import { JsonSchema } from "../lib/anthropic";
import { createPipelineStage } from "./utils";

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

const SYSTEM_PROMPT = `
You are a perfect Arabic OCR model that never makes mistakes. Your task is to take an image and a less accurate OCR model output, and generate the perfect transcription of the Arabic text in the image. Follow these instructions carefully:

You will be presented with the output from a less accurate OCR model and the original image.

Your task is to:

1. Carefully examine both the OCR output and the image.

2. Modify and correct the original OCR output. Pay close attention to any errors or inconsistencies between the OCR output and the actual text in the image. Correct any mistakes in spelling, punctuation, or word order. If the given OCR output does not contain any errors, keep it as it is.

3. Segment the content into the following sections:
   a. Header (if present)
   b. Body
   c. Footnotes (if present)
   d. Page number

4. Use appropriate HTML tags to format the content when plausible. DO NOT return an entire HTML document, just add relevant tags to structure the content. For example, use <h1> for main headers, <p> for paragraphs, <sup> for superscript footnote numbers, etc.

5. Prepare your output in the following JSON format:
{
  header: String | null,
  body: String,
  footnotes: String | null,
  pageNumber: Number
}

If a section is empty or not applicable, set its value to \`null\`.

Additional guidelines:
- Ensure that your transcription perfectly matches the text in the image, including any diacritical marks or special characters.
- Preserve the original formatting and layout of the text as much as possible within the constraints of the output format.
- If you encounter any ambiguous or unclear text in the image, use your perfect OCR capabilities to accurately determine the correct text.
- Do not add any information that is not present in the image.
- The page number should be extracted from the image if visible. If not visible, use your best judgment based on the content to estimate the page number.

Remember, you are a perfect Arabic OCR model, so your output should be flawless and complete.
`.trim();

export const finalStage = createPipelineStage(
  async ({ page, caller, mode }) => {
    const response = await caller(
      [
        {
          role: "system",
          content: SYSTEM_PROMPT,
          //           content: `
          // You are a perfect Arabic OCR model that never makes mistakes, you take an image and a less accurate OCR model output, and generate the perfect transcription by doing the following:

          // 1. Modify and correct the original OCR output. It is possible that the given OCR output does not contain any errors, in this case, keep it as it is.

          // 2. Segment the content into a header (optional), body, footnotes (optional), and page number. Make sure to use html formatting when plausible (DO NOT RETURN AN ENTIRE HTML DOCUMENT, JUST ADD TAGS).

          // The output should match the following json format:
          // {
          //   header: String | null,
          //   body: String,
          //   footnotes: String | null,
          //   pageNumber: Number
          // }.

          // If a section is empty or not applicable make the value \`null\`
          // `.trim(),
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
  },
);
