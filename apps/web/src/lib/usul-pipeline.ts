import { env } from "@/env";

const makePipelinePostRequest = async <T>(
  endpoint: string,
  body?: Record<string, any>,
) => {
  const response = await fetch(`${env.USUL_PIPELINE_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.USUL_PIPELINE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  return response.json() as Promise<T>;
};

const makePipelineGetRequest = async <T>(endpoint: string) => {
  const response = await fetch(`${env.USUL_PIPELINE_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.USUL_PIPELINE_API_KEY}`,
    },
  });

  return response.json() as Promise<T>;
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

export const reIndexTypesense = async () => {
  return makePipelinePostRequest<
    | { status: "STARTED"; requestedAt: number }
    | {
        status: "IN_PROGRESS";
      }
  >("/typesense/index");
};

export const getTypesenseStatus = async () => {
  return makePipelineGetRequest<
    { status: "BUSY"; requestedAt: number } | { status: "IDLE" }
  >("/typesense/status");
};

export const purgeCloudflareCache = async () => {
  return makePipelinePostRequest<{ success: boolean }>("/cache/purge");
};
