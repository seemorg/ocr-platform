import type { usulDb } from "@/server/db";
import { regenerateAuthor } from "@/lib/usul-pipeline";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

export const updateAuthorSchema = z.object({
  id: z.string(),
  arabicName: z.string(),
  arabicBio: z.string().optional(),
  transliteration: z.string(),
  otherArabicNames: z.array(z.string()).optional(),
  deathYear: z.number().optional(),
  yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
});

export const updateAuthor = async (
  input: z.infer<typeof updateAuthorSchema>,
  db: typeof usulDb,
) => {
  if (!input.yearStatus && !input.deathYear) {
    throw new Error("Year status or death year is required");
  }

  const currentAuthor = await db.author.findFirst({
    where: { id: input.id },
    select: {
      id: true,
      transliteration: true,
      primaryNameTranslations: {
        where: {
          locale: "ar",
        },
      },
      bioTranslations: {
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

  // const didBioChange =
  //   input.arabicBio !== currentAuthor?.bioTranslations[0]?.text;

  await db.author.update({
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
        upsert: [
          {
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
        ],
      },
      bioTranslations: {
        ...(input.arabicBio
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
                  text: input.arabicBio,
                },
                update: {
                  text: input.arabicBio,
                },
              },
            }
          : {
              delete: {
                authorId_locale: {
                  authorId: input.id,
                  locale: "ar",
                },
              },
            }),
      },
    },
  });

  if (didNameChange) {
    await regenerateAuthor({
      id: input.id,
      regenerateNames: true,
      regenerateBio: true,
    });
  }
};
