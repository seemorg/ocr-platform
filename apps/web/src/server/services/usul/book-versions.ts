import { z } from "zod";

const publicationDetailsSchema = {
  publisher: z.string().optional(),
  publisherLocation: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.string().optional(),
  investigator: z.string().optional(),
};

const sharedSchema = {
  id: z.string(),
  aiSupported: z.boolean().optional(),
  keywordSupported: z.boolean().optional(),
  ...publicationDetailsSchema,
};

const splitsDataSchema = z.array(
  z.object({
    start: z.number(),
    end: z.number(),
  }),
);

const pdfUrlSchema = z
  .string()
  .url()
  .startsWith("https://assets.usul.ai/pdfs/");

export const bookVersionSchema = z.discriminatedUnion("type", [
  z.object({
    ...sharedSchema,
    type: z.literal("external"),
    url: z.string().url(),
  }),
  z.object({
    ...sharedSchema,
    type: z.literal("pdf"),
    url: pdfUrlSchema,
    ocrBookId: z.string().optional(),
    splitsData: splitsDataSchema.optional(),
  }),
  z.object({
    ...sharedSchema,
    type: z.literal("openiti"),
    value: z.string().min(1),
    pdfUrl: pdfUrlSchema.optional(),
    splitsData: splitsDataSchema.optional(),
  }),
  z.object({
    ...sharedSchema,
    type: z.literal("turath"),
    value: z.string().min(1),
    pdfUrl: pdfUrlSchema.optional(),
    splitsData: splitsDataSchema.optional(),
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
        source: "external" as const,
        value: version.url,
      };
    }

    if (version.type === "pdf") {
      obj = {
        source: "pdf" as const,
        value: version.url,
        ...(version.ocrBookId ? { ocrBookId: version.ocrBookId } : {}),
        ...(version.splitsData && version.splitsData.length > 0
          ? { splitsData: version.splitsData }
          : {}),
      };
    }

    if (version.type === "turath" || version.type === "openiti") {
      obj = {
        source: version.type as "turath" | "openiti",
        value: version.value,
        ...(version.pdfUrl ? { pdfUrl: version.pdfUrl } : {}),
        ...(version.splitsData && version.splitsData.length > 0
          ? { splitsData: version.splitsData }
          : {}),
      };
    }

    if (obj) {
      let existingVersion = currentVersions?.find((v) => v.id === obj.id);
      final.push({
        ...(obj as PrismaJson.BookVersion),
        id: version.id,
        publicationDetails,
        ...(existingVersion?.aiSupported ? { aiSupported: true } : {}),
        ...(existingVersion?.keywordSupported
          ? { keywordSupported: true }
          : {}),

        ...(existingVersion?.source === "pdf" &&
        obj.source === "pdf" &&
        existingVersion?.value === obj.value
          ? { splitsData: existingVersion.splitsData }
          : {}),
        ...(existingVersion?.source === "turath" ||
        (existingVersion?.source === "openiti" &&
          (obj.source === "turath" || obj.source === "openiti") &&
          existingVersion?.pdfUrl === obj.pdfUrl)
          ? { splitsData: existingVersion.splitsData }
          : {}),
      });
    }
  });

  return final;
};
