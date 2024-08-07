import { PipelineMode, PipelinePage } from "../types/pipeline";
import { getCallerByMode, isOpenAIContentPolicyError } from "./utils";

export const correctOcrResponse = async (
  page: PipelinePage,
  mode: PipelineMode = "azure",
) => {
  const caller = getCallerByMode(mode);

  try {
    const response = await caller([
      {
        role: "system",
        content:
          "The following is the output of an OCR system that might contain mistakes or have the words be out of order. Given the following image and what the ocr generated, created the modified and correct version. It is possible that initial output does not contain any errors.",
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
    ]);

    return response;
  } catch (e) {
    if (isOpenAIContentPolicyError(e)) return null;
    throw e;
  }
};
