import { z } from "zod";

const publicationDetailsSchema = {
  publisher: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.number().optional(),
  investigator: z.string().optional(),
};

export const bookVersionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("external"),
    url: z.string().url(),
    ...publicationDetailsSchema,
  }),
  z.object({
    type: z.literal("pdf"),
    url: z.string().url().startsWith("https://assets.usul.ai/pdfs/"),
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
) => {
  const final: PrismaJson.BookVersion[] = [];

  versions.forEach((version) => {
    const publicationDetails = {
      ...(version.investigator ? { investigator: version.investigator } : {}),
      ...(version.publisher ? { publisher: version.publisher } : {}),
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

    if (version.type === "external") {
      final.push({
        source: "external" as const,
        value: version.url,
        publicationDetails,
      });
    }

    if (version.type === "pdf") {
      final.push({
        source: "pdf" as const,
        value: version.url,
        publicationDetails,
        ...(version.splitsData && version.splitsData.length > 0
          ? { splitsData: version.splitsData }
          : {}),
      });
    }
  });

  return final;
};
