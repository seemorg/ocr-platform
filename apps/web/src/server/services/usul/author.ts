import type { usulDb } from "@/server/db";
import { textToSlug } from "@/lib/slug";

const doesAuthorSlugExist = async (slug: string, db: typeof usulDb) => {
  const author = await db.author.findUnique({
    where: { slug },
    select: { id: true },
  });

  return !!author;
};

export const createUniqueAuthorSlug = async (
  text: string,
  db: typeof usulDb,
) => {
  let slug = textToSlug(text);
  let increment = 0;
  while (await doesAuthorSlugExist(slug, db)) {
    increment++;
    slug = textToSlug(`${text}-${increment}`);
  }

  return slug;
};

export const getAuthor = async (
  data:
    | {
        id: string;
      }
    | { slug: string }
    | {
        _airtableReference: string;
      },
  db: typeof usulDb,
) => {
  const author = await db.author.findFirst({
    where:
      "_airtableReference" in data
        ? {
            extraProperties: {
              path: ["_airtableReference"],
              equals: data._airtableReference,
            },
          }
        : data,
    select: {
      id: true,
      primaryNameTranslations: {
        where: {
          locale: { in: ["ar", "en"] },
        },
      },
    },
  });

  if (!author) {
    return null;
  }

  return {
    id: author.id,
    // ar first if exists, then en
    name: (author.primaryNameTranslations.find(
      (translation) => translation.locale === "ar",
    )?.text ??
      author.primaryNameTranslations.find(
        (translation) => translation.locale === "en",
      )?.text)!,
  };
};
