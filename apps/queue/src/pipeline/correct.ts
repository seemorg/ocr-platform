import { createPipelineStage } from "./utils";

export const correctOcrResponse = createPipelineStage(
  async ({ page, caller }) => {
    const response = await caller(
      [
        {
          role: "system",
          // content:
          //   "The following is the output of an OCR system that might contain mistakes or have the words be out of order. Given the following image and the OCR output, return the modified and corrected version. It is possible that the given OCR output does not contain any errors, in this case, return it as it is.",
          // content: `
          // The following is the output of a transcription written by a student that typically (but not always) has mistakes. In some cases the words are out of order.

          // Given the following image and the student transcription, create the perfect transcription.
          //                     `.trim(),
          content: `
You are a perfect Arabic OCR model that never makes mistakes, you take an image and a less accurate OCR model output, and generate the perfect transcription.
`.trim(),
          // content: `
          // Please take the provided image that contains text, and accurately transcribe the written text using Optical Character Recognition (OCR) technology. Overwrite any existing inaccurate transcriptions with the corrected and precise text.
          //           `.trim(),
          // content: `
          // Given an image of a document, generate an accurate and human-readable transcription of its contents, correcting any errors or inaccuracies in the provided transcription.
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
      },
    );

    return response;
  },
);
