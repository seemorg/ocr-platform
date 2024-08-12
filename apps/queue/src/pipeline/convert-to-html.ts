import { createPipelineStage } from "./utils";

/**
 * Use sup and tables
 * Use h1 for book names
 * Use h2 for chapter names
 * Use h3 for sections within a chapter
 */

const SYSTEM_PROMPT = `
Given the following output of an OCR system and image it was generated from. Highlight the headers, split the text into paragraphs, and add text formatting using the html format. DO NOT modify the content of the of the output, just add html formatting. Where applicable, be sure to: 

- Use appropriate HTML tags to format the content when plausible. DO NOT return an entire HTML document, just add relevant tags to structure the content. For example, use <h1> for book title, <h2> for chapter names, <h3> for sub-chapters, <p> for paragraphs, <sup> for superscript footnote numbers, etc.

- Match the document numbering style, e.g. "(1)" vs "1." vs "1)" etc.

- Preserve the original formatting and layout of the text as much as possible within the constraints of the output format.
`;

export const convertOcrResponseToHtml = createPipelineStage(
  async ({ page, caller }) => {
    const response = await caller(
      [
        {
          role: "system",
          // content: `Given the following output of an OCR system and image it was generated from. Highlight the headers, split the text into paragraphs, and add text formatting using the html format. DO NOT modify the content of the of the output, just add html formatting. Do not return a full html document, but rather just add where applicable.`,
          content: SYSTEM_PROMPT,
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
      },
    );

    return response;
  },
);
