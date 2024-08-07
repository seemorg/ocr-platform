import { ocrPage } from "../lib/ocr";
import { PipelineMode } from "../types/pipeline";
import { convertOcrResponseToHtml } from "./convert-to-html";
import { correctOcrResponse } from "./correct";
import { segmentOcrResponse } from "./segment";
import { prepareCaller } from "./utils";

export async function executePipelineForPage(
  url: string,
  pageIndex: number,
  options?: {
    returnRaw?: boolean;
    mode?: PipelineMode;
  },
) {
  const finalMode = options?.mode || "azure";
  const shouldFallback = options?.mode ? false : true;

  const page = await ocrPage(url, pageIndex);
  console.log(`[PIPELINE] Correcting page ${page.pageNumber}`);

  const corrected = await prepareCaller(correctOcrResponse, {
    params: page,
    mode: finalMode,
    shouldFallback,
  });
  if (!corrected) {
    console.log("Could not correct");
    return { error: true as const, value: page.text };
  }

  console.log(`[PIPELINE] Converting page ${page.pageNumber}`);
  const updatedPage = { text: corrected, imageBase64: page.imageBase64 };
  const html = await prepareCaller(convertOcrResponseToHtml, {
    params: updatedPage,
    mode: finalMode,
    shouldFallback,
  });
  if (!html) {
    console.log("Could not highlight");
    return { error: true as const, value: corrected };
  }

  console.log(`[PIPELINE] Segmenting page ${page.pageNumber}`);
  const htmlPage = { text: html, imageBase64: page.imageBase64 };
  const segmentedHtml = await prepareCaller(segmentOcrResponse, {
    params: htmlPage,
    mode: finalMode,
    shouldFallback,
  });
  if (!segmentedHtml) {
    console.log("Could not segment");
    return { error: true as const, value: html };
  }

  const final = {
    error: false as const,
    value: segmentedHtml,
  } as {
    error: false;
    value: NonNullable<typeof segmentedHtml>;
    raw?: {
      ocr: string;
      corrected: string;
      html: string;
      segmentedHtml: NonNullable<typeof segmentedHtml>;
    };
  };

  if (options?.returnRaw) {
    final.raw = {
      ocr: page.text,
      corrected,
      html,
      segmentedHtml,
    };
  }

  return final;
}
