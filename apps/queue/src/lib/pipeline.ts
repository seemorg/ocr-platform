import { ocrPage } from "./ocr";
import { getChatCompletions } from "./openai";

type Page = {
  imageBase64: string;
  text: string;
};

export const correctOcrResponse = async (page: Page) => {
  const response = await getChatCompletions([
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
  ]).catch((e) => {
    if (e.message.includes(`Azure OpenAI's content management policy`)) {
      return null;
    }

    throw e;
  });

  return response;
};

export const convertOcrResponseToHtml = async (page: Page) => {
  const response = await getChatCompletions([
    {
      role: "system",
      content: `Given the following output of an OCR system and image it was generated from. Highlight the headers, split the text into paragraphs, and add text formatting using the html format. DO NOT modify the content of the of the output, just add html formatting.`,
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
  ]).catch((e) => {
    if (e.message.includes(`Azure OpenAI's content management policy`)) {
      return null;
    }

    throw e;
  });

  return response;
};

export const segmentOcrResponse = async (page: Page) => {
  const response = await getChatCompletions(
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
      responseFormat: { type: "json_object" },
    },
  ).catch((e) => {
    if (e.message.includes(`Azure OpenAI's content management policy`)) {
      return null;
    }

    throw e;
  });

  const content = response;
  if (!content) return null;

  try {
    return JSON.parse(content) as {
      header: string | null;
      body: string;
      footnotes: string | null;
      pageNumber: number;
    };
  } catch (e) {
    console.log(e);
    return null;
  }
};

export async function pdfPipelineForPage(url: string, pageIndex: number) {
  const page = await ocrPage(url, pageIndex);
  console.log(`[PIPELINE] Correcting page ${page.pageNumber}`);

  const corrected = await correctOcrResponse(page);
  if (!corrected) {
    console.log("Could not correct");
    return { error: true as const, value: page.text };
  }

  console.log(`[PIPELINE] Converting page ${page.pageNumber}`);
  const updatedPage = { text: corrected, imageBase64: page.imageBase64 };
  const html = await convertOcrResponseToHtml(updatedPage);
  if (!html) {
    console.log("Could not highlight");
    return { error: true as const, value: corrected };
  }

  console.log(`[PIPELINE] Segmenting page ${page.pageNumber}`);
  const htmlPage = { text: html, imageBase64: page.imageBase64 };
  const segmentedHtml = await segmentOcrResponse(htmlPage);
  if (!segmentedHtml) {
    console.log("Could not segment");
    return { error: true as const, value: html };
  }

  return { error: false as const, value: segmentedHtml };
}
