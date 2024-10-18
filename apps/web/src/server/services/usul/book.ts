import type { usulDb } from "@/server/db";
import { textToSlug } from "@/lib/slug";

const doesBookSlugExist = async (slug: string, db: typeof usulDb) => {
  const book = await db.book.findFirst({
    where: { slug },
    select: { id: true },
  });

  return !!book;
};

export const createUniqueBookSlug = async (text: string, db: typeof usulDb) => {
  let slug = textToSlug(text);
  let increment = 0;
  while (await doesBookSlugExist(slug, db)) {
    increment++;
    slug = textToSlug(`${text}-${increment}`);
  }

  return slug;
};
