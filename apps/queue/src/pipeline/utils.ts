import { getChatCompletions as anthropic } from "../lib/anthropic";
import { getChatCompletions as azure } from "../lib/openai";
import { PipelineMode, PipelinePage } from "../types/pipeline";

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

export const createPipelineStage = <T extends any>(
  callback: (params: {
    page: PipelinePage;
    caller: ReturnType<typeof getCallerByMode>;
    mode: PipelineMode;
  }) => Promise<T>,
) => {
  return async (page: PipelinePage, mode: PipelineMode = "azure") => {
    const caller = getCallerByMode(mode);

    try {
      const result = await callback({ page, caller, mode });
      return { result };
    } catch (e) {
      if (isOpenAIContentPolicyError(e))
        return { result: null, error: "content_policy_error" };
      return { result: null, error: e };
    }
  };
};
