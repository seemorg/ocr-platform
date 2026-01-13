import type { usulDb } from "@/server/db";
import { addAuthorToPipeline } from "@/lib/usul-pipeline";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

import { createUniqueAuthorSlug } from "../author";

export const createAuthorSchema = z.object({
  arabicName: z.string(),
  transliteration: z.string(),
  otherArabicNames: z.array(z.string()).optional(),
  arabicBio: z.string().optional(),
  slug: z.string().optional(),
  deathYear: z.number().optional(),
  yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
  empireIds: z.array(z.string()).optional(),
  regionIds: z.array(z.string()).optional(),
});

export const createAuthor = async (
  input: z.infer<typeof createAuthorSchema>,
  db: typeof usulDb,
) => {
  if (!input.yearStatus && !input.deathYear) {
    throw new Error("Year status or death year is required");
  }

  let slug;

  if (input.slug) {
    slug = input.slug;
  } else {
    slug = await createUniqueAuthorSlug(input.transliteration, db);
  }

  const newAuthor = await db.author.create({
    data: {
      id: createId(),
      slug,
      transliteration: input.transliteration,
      year: input.deathYear,
      yearStatus: input.yearStatus,
      ...(input.otherArabicNames
        ? {
          otherNameTranslations: {
            create: {
              locale: "ar",
              texts: input.otherArabicNames,
            },
          },
        }
        : {}),
      primaryNameTranslations: {
        create: {
          locale: "ar",
          text: input.arabicName,
        },
      },
      ...(input.arabicBio
        ? {
          bioTranslations: {
            create: { locale: "en", text: input.arabicBio },
          },
        }
        : {}),
      ...(input.empireIds && input.empireIds.length > 0
        ? {
          AuthorToEmpire: {
            create: input.empireIds.map((empireId) => ({
              Empire: {
                connect: { id: empireId },
              },
            })),
          },
        }
        : {}),
      ...(input.regionIds && input.regionIds.length > 0
        ? {
          AuthorToRegion: {
            create: input.regionIds.map((regionId) => ({
              Region: {
                connect: { id: regionId },
              },
            })),
          },
        }
        : {}),
    },
  });

  await addAuthorToPipeline({
    slug: newAuthor.slug,
    arabicName: input.arabicName,
  });

  return { id: newAuthor.id };
};
