import { env } from "@/env";

const makePipelineRequest = async <T>(
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

export const addBookToPipeline = async ({
  slug,
  arabicName,
  authorArabicName,
}: {
  slug: string;
  arabicName: string;
  authorArabicName: string;
}) => {
  return makePipelineRequest<{ success: boolean }>(`/books`, {
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
  return makePipelineRequest<{ success: boolean }>(`/authors`, {
    slug,
    arabicName,
  });
};
