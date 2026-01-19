import { env } from "@/env";

const PIPELINE_TIMEOUT_MS = 10000; // 10 seconds

const makePipelinePostRequest = async <T>(
  endpoint: string,
  body?: Record<string, any>,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PIPELINE_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.USUL_PIPELINE_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.USUL_PIPELINE_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Pipeline request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Pipeline request timed out after ${PIPELINE_TIMEOUT_MS}ms`);
    }
    throw error;
  }
};

const makeApiPostRequest = async <T>(
  endpoint: string,
  body?: Record<string, any>,
) => {
  const response = await fetch(`https://api.usul.ai${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.USUL_API_SECRET}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json() as Promise<T>;
};

const makePipelineGetRequest = async <T>(endpoint: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PIPELINE_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.USUL_PIPELINE_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.USUL_PIPELINE_API_KEY}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Pipeline request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Pipeline request timed out after ${PIPELINE_TIMEOUT_MS}ms`);
    }
    throw error;
  }
};

export const addBookToPipeline = async ({
  slug,
  arabicName,
  authorArabicName,
}: {
  slug: string;
  arabicName: string;
  authorArabicName: string;
}) => {
  return makePipelinePostRequest<{ success: boolean }>("/books", {
    slug,
    arabicName,
    authorArabicName,
  });
};

export const addAuthorToPipeline = async ({
  slug,
  arabicName,
}: {
  slug: string;
  arabicName: string;
}) => {
  return makePipelinePostRequest<{ success: boolean }>("/authors", {
    slug,
    arabicName,
  });
};

// Non-blocking versions that don't throw errors
export const addBookToPipelineSafe = async (params: {
  slug: string;
  arabicName: string;
  authorArabicName: string;
}) => {
  try {
    await addBookToPipeline(params);
  } catch (error) {
    console.error("Failed to add book to pipeline (non-blocking):", error);
  }
};

export const addAuthorToPipelineSafe = async (params: {
  slug: string;
  arabicName: string;
}) => {
  try {
    await addAuthorToPipeline(params);
  } catch (error) {
    console.error("Failed to add author to pipeline (non-blocking):", error);
  }
};

export const regenerateBook = async ({
  id,
  regenerateNames,
  regenerateCover,
}: {
  id: string;
  regenerateNames?: boolean;
  regenerateCover?: boolean;
}) => {
  return makePipelinePostRequest<{ success: boolean }>("/books/regenerate", {
    id,
    regenerateNames,
    regenerateCover,
  });
};

export const regenerateAuthor = async ({
  id,
  regenerateNames,
  bioAr,
  bioEn,
}: {
  id: string;
  regenerateNames?: boolean;
  bioEn?: string;
  bioAr?: string;
}) => {
  return makePipelinePostRequest<{ success: boolean }>("/authors/regenerate", {
    id,
    regenerateNames,
    bioEn,
    bioAr,
  });
};

export const reIndexTypesense = async ({
  clearCloudflareCache = false,
}: {
  clearCloudflareCache?: boolean;
}) => {
  return makePipelinePostRequest<
    | { status: "STARTED"; requestedAt: number }
    | {
      status: "IN_PROGRESS";
    }
  >("/typesense/index", { clearCloudflareCache });
};

export const getTypesenseStatus = async () => {
  return makePipelineGetRequest<
    { status: "BUSY"; requestedAt: number } | { status: "IDLE" }
  >("/typesense/status");
};

export const purgeCloudflareCache = async () => {
  return makePipelinePostRequest<{ success: boolean }>("/cache/purge");
};

export const purgeApiCache = async () => {
  return makeApiPostRequest<{ success: boolean }>("/reset-cache");
};

export const purgeApiSlugsCache = async () => {
  return makeApiPostRequest<{ success: boolean }>("/reset-cache/slugs");
};
