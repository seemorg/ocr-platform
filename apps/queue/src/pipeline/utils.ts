import { getChatCompletions as anthropic } from "../lib/anthropic";
import { getChatCompletions as azure } from "../lib/openai";
import { PipelineMode } from "../types/pipeline";

export const getCallerByMode = (mode: PipelineMode) => {
  if (mode === "azure") return azure;
  return anthropic;
};

export const isOpenAIContentPolicyError = (e: unknown) => {
  return (e as any)?.message?.includes(
    `Azure OpenAI's content management policy`,
  );
};

export const prepareCaller = async <
  T extends (param: any, mode?: PipelineMode) => Promise<any>,
>(
  caller: T,
  options: {
    params: Parameters<T>[0];
    mode: PipelineMode;
    shouldFallback?: boolean;
  },
): Promise<ReturnType<T> | null> => {
  let response = await caller(options.params, options.mode);
  if (response || options.shouldFallback === false) {
    return response;
  }

  response = await caller(
    options.params,
    options.mode === "azure" ? "claude" : "azure",
  );
  return response;
};
