import { PipelineMode, PipelinePage } from "../types/pipeline";
import { getCallerByMode, isOpenAIContentPolicyError } from "./utils";

export const convertOcrResponseToHtml = async (
  page: PipelinePage,
  mode: PipelineMode = "azure",
) => {
  const caller = getCallerByMode(mode);

  try {
    const response = await caller(
      [
        {
          role: "system",
          content: `Given the following output of an OCR system and image it was generated from. Highlight the headers, split the text into paragraphs, and add text formatting using the html format. DO NOT modify the content of the of the output, just add html formatting. Do not return a full html document, but rather just add where applicable.`,
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
  } catch (e) {
    if (isOpenAIContentPolicyError(e)) return null;
    throw e;
  }
};
