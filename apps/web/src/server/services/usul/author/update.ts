import type { usulDb } from "@/server/db";
import { purgeApiSlugsCache, regenerateAuthor } from "@/lib/usul-pipeline";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

export const updateAuthorSchema = z.object({
  id: z.string(),
  arabicName: z.string(),
  transliteration: z.string(),
  otherArabicNames: z.array(z.string()).optional(),
  deathYear: z.number().optional(),
  yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
  arabicBio: z.string().optional(),
  englishBio: z.string().optional(),
  empireIds: z.array(z.string()).optional(),
  regionIds: z.array(z.string()).optional(),
});

export const updateAuthor = async (
  input: z.infer<typeof updateAuthorSchema>,
  db: typeof usulDb,
) => {
  if (!input.yearStatus && !input.deathYear) {
    throw new Error("Year status or death year is required");
  }

  const isChangingArabicBio = input.arabicBio !== undefined;
  const isChangingEnglishBio = input.englishBio !== undefined;

  if (isChangingArabicBio && isChangingEnglishBio) {
    throw new Error("Cannot change both Arabic and English bio");
  }

  const currentAuthor = await db.author.findFirst({
    where: { id: input.id },
    select: {
      id: true,
      slug: true,
      transliteration: true,
      primaryNameTranslations: {
        where: {
          locale: "ar",
        },
      },
    },
  });

  if (!currentAuthor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Author not found",
    });
  }

  const didNameChange =
    input.arabicName !== currentAuthor?.primaryNameTranslations[0]?.text;

  // Handle empire and region updates if provided
  if (input.empireIds !== undefined) {
    // Delete existing empire connections
    await db.authorToEmpire.deleteMany({
      where: { A: input.id },
    });

    // Create new empire connections
    if (input.empireIds.length > 0) {
      await db.authorToEmpire.createMany({
        data: input.empireIds.map((empireId) => ({
          A: input.id,
          B: empireId,
        })),
      });
    }
  }

  if (input.regionIds !== undefined) {
    // Delete existing region connections
    await db.authorToRegion.deleteMany({
      where: { A: input.id },
    });

    // Create new region connections
    if (input.regionIds.length > 0) {
      await db.authorToRegion.createMany({
        data: input.regionIds.map((regionId) => ({
          A: input.id,
          B: regionId,
        })),
      });
    }
  }

  const newAuthor = await db.author.update({
    where: { id: input.id },
    data: {
      transliteration: input.transliteration,
      year: input.deathYear,
      yearStatus: input.yearStatus,
      ...(input.otherArabicNames
        ? {
          otherNameTranslations: {
            upsert: {
              where: {
                authorId_locale: {
                  authorId: input.id,
                  locale: "ar",
                },
              },
              create: {
                locale: "ar",
                texts: input.otherArabicNames,
              },
              update: {
                texts: input.otherArabicNames,
              },
            },
          },
        }
        : {}),
      primaryNameTranslations: {
        upsert: {
          where: {
            authorId_locale: {
              authorId: input.id,
              locale: "ar",
            },
          },
          create: {
            locale: "ar",
            text: input.arabicName,
          },
          update: {
            text: input.arabicName,
          },
        },
      },
      bioTranslations: {
        ...(isChangingArabicBio
          ? {
            upsert: {
              where: {
                authorId_locale: {
                  authorId: input.id,
                  locale: "ar",
                },
              },
              create: {
                locale: "ar",
                text: input.arabicBio!,
              },
              update: {
                text: input.arabicBio!,
              },
            },
          }
          : {}),
        ...(isChangingEnglishBio
          ? {
            upsert: {
              where: {
                authorId_locale: {
                  authorId: input.id,
                  locale: "en",
                },
              },
              create: {
                locale: "en",
                text: input.englishBio!,
              },
              update: {
                text: input.englishBio!,
              },
            },
          }
          : {}),
      },
    },
  });

  // add old slug as alternative slug
  if (newAuthor.slug !== currentAuthor.slug) {
    try {
      await db.authorAlternateSlug.create({
        data: {
          author: { connect: { id: newAuthor.id } },
          slug: currentAuthor.slug,
        },
      });
      await purgeApiSlugsCache();
    } catch (e) {
      console.log(e);
    }
  }

  if (didNameChange || isChangingArabicBio || isChangingEnglishBio) {
    await regenerateAuthor({
      id: input.id,
      regenerateNames: didNameChange,
      ...(isChangingArabicBio
        ? { bioAr: input.arabicBio! }
        : isChangingEnglishBio
          ? { bioEn: input.englishBio! }
          : {}),
    });
  }
};
