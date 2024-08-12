import { ocrPage as azureOcr } from "../lib/ocr";
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

  const page = await azureOcr(url, pageIndex);

  // const result = await prepareCaller(finalStage, {
  //   params: page,
  //   mode: finalMode,
  //   shouldFallback,
  // });

  // if (!result) {
  //   console.log("Could not get output");
  //   return { error: true as const, value: page.text };
  // }

  // const final = {
  //   error: false as const,
  //   value: result,
  // } as {
  //   error: false;
  //   value: NonNullable<typeof result>;
  //   raw?: {
  //     ocr: string;

  //     segmentedHtml: NonNullable<typeof result>;
  //   };
  // };

  // if (options?.returnRaw) {
  //   final.raw = {
  //     ocr: page.text,
  //     segmentedHtml: result,
  //   };
  // }

  // return final;

  console.log(`[PIPELINE] Correcting page ${page.pageNumber}`);
  const corrected = await prepareCaller(correctOcrResponse, {
    params: page,
    mode: finalMode,
    shouldFallback,
  });
  if (!corrected?.result) {
    console.log("Could not correct");
    return {
      error: true as const,
      value: page.text,
      failedStage: "CORRECT",
      reason: corrected?.error,
    };
  }

  console.log(`[PIPELINE] Converting page ${page.pageNumber}`);
  const updatedPage = { text: corrected.result, imageBase64: page.imageBase64 };
  const html = await prepareCaller(convertOcrResponseToHtml, {
    params: updatedPage,
    mode: finalMode,
    shouldFallback,
  });

  if (!html?.result) {
    console.log("Could not highlight");
    return {
      error: true as const,
      value: corrected.result,
      failedStage: "CONVERT_TO_HTML",
      reason: html?.error,
    };
  }

  console.log(`[PIPELINE] Segmenting page ${page.pageNumber}`);
  const htmlPage = { text: html.result, imageBase64: page.imageBase64 };
  const segmentedHtml = await prepareCaller(segmentOcrResponse, {
    params: htmlPage,
    mode: finalMode,
    shouldFallback,
  });

  if (!segmentedHtml?.result) {
    console.log("Could not segment");
    return {
      error: true as const,
      value: html.result,
      failedStage: "SEGMENT",
      reason: segmentedHtml?.error,
    };
  }

  const final = {
    error: false as const,
    value: segmentedHtml.result,
  } as {
    error: false;
    value: NonNullable<(typeof segmentedHtml)["result"]>;
    raw?: {
      ocr: string;
      corrected: string;
      html: string;
      segmentedHtml: NonNullable<(typeof segmentedHtml)["result"]>;
    };
  };

  if (options?.returnRaw) {
    final.raw = {
      ocr: page.text,
      corrected: corrected.result,
      html: html.result,
      segmentedHtml: segmentedHtml.result,
    };
  }

  return final;
}
