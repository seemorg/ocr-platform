import { nanoid } from "nanoid";
import { z } from "zod";

const createVersionId = () => nanoid(10);

const publicationDetailsSchema = {
  publisher: z.string().optional(),
  publisherLocation: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.number().optional(),
  investigator: z.string().optional(),
};

export const bookVersionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().optional(),
    type: z.literal("external"),
    url: z.string().url(),
    aiSupported: z.boolean().optional(),
    keywordSupported: z.boolean().optional(),
    ...publicationDetailsSchema,
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("pdf"),
    url: z.string().url().startsWith("https://assets.usul.ai/pdfs/"),
    aiSupported: z.boolean().optional(),
    keywordSupported: z.boolean().optional(),
    ocrBookId: z.string().optional(),
    splitsData: z
      .array(
        z.object({
          start: z.number(),
          end: z.number(),
        }),
      )
      .optional(),
    ...publicationDetailsSchema,
  }),
]);

export const prepareBookVersions = (
  versions: z.infer<typeof bookVersionSchema>[],
  currentVersions?: PrismaJson.BookVersion[],
) => {
  const final: PrismaJson.BookVersion[] = [];

  versions.forEach((version) => {
    const publicationDetails = {
      ...(version.investigator ? { investigator: version.investigator } : {}),
      ...(version.publisher ? { publisher: version.publisher } : {}),
      ...(version.publisherLocation
        ? { publisherLocation: version.publisherLocation }
        : {}),
      ...(version.editionNumber
        ? {
            editionNumber: version.editionNumber,
          }
        : {}),
      ...(version.publicationYear
        ? {
            publicationYear: version.publicationYear,
          }
        : {}),
    };

    let obj: Partial<PrismaJson.BookVersion> | null = null;

    if (version.type === "external") {
      obj = {
        id: version.id ?? createVersionId(),
        source: "external" as const,
        value: version.url,
        publicationDetails,
      };
    }

    if (version.type === "pdf") {
      obj = {
        id: version.id ?? createVersionId(),
        source: "pdf" as const,
        value: version.url,
        publicationDetails,
        ...(version.ocrBookId ? { ocrBookId: version.ocrBookId } : {}),
        ...(version.splitsData && version.splitsData.length > 0
          ? { splitsData: version.splitsData }
          : {}),
      };
    }

    if (obj) {
      let existingVersion = currentVersions?.find((v) => v.id === obj.id);
      final.push({
        ...(obj as PrismaJson.BookVersion),
        ...(existingVersion?.aiSupported ? { aiSupported: true } : {}),
        ...(existingVersion?.keywordSupported
          ? { keywordSupported: true }
          : {}),
      });
    }
  });

  if (currentVersions) {
    return [
      ...currentVersions
        .filter(
          (version) =>
            version.source !== "pdf" && version.source !== "external",
        )
        .map(({ id, ...rest }) => ({
          id: id ?? createVersionId(),
          ...rest,
        })),
      ...final,
    ];
  }

  return final;
};
