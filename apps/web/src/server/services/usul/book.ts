import type { usulDb } from "@/server/db";
import { parseLocalizedEntries } from "@/lib/localization";
import { textToSlug } from "@/lib/slug";

const doesBookSlugExist = async (
  slug: string,
  db: typeof usulDb,
  except?: string[],
) => {
  const book = await db.book.findFirst({
    where: { slug, id: { notIn: except } },
    select: { id: true },
  });

  return !!book;
};

export const createUniqueBookSlug = async (
  text: string,
  db: typeof usulDb,
  except?: string[],
) => {
  let slug = textToSlug(text);
  let increment = 0;
  while (await doesBookSlugExist(slug, db, except)) {
    increment++;
    slug = textToSlug(`${text}-${increment}`);
  }

  return slug;
};

export const getBookWithDetailsById = async (id: string, db: typeof usulDb) => {
  const book = await db.book.findFirst({
    where: { id },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      physicalDetails: true,
      extraProperties: true,
      author: {
        select: {
          id: true,
          slug: true,
          transliteration: true,
          year: true,
          primaryNameTranslations: {
            where: {
              locale: "ar",
            },
          },
        },
      },
      primaryNameTranslations: {
        where: {
          locale: {
            in: ["ar", "en"],
          },
        },
      },
      otherNameTranslations: {
        where: {
          locale: "ar",
        },
      },
      transliteration: true,
      advancedGenres: {
        select: { id: true },
      },
      versions: true,
    },
  });

  if (!book) {
    return null;
  }

  const bookNames = parseLocalizedEntries(book.primaryNameTranslations);
  const otherNames = parseLocalizedEntries(book.otherNameTranslations);

  const authorNames = parseLocalizedEntries(
    book.author.primaryNameTranslations,
  );

  const versions = book.versions;

  let physicalDetails:
    | (Extract<
        NonNullable<PrismaJson.BookExtraProperties["physicalDetails"]>,
        { type: "manuscript" }
      > & { details: string })
    | Extract<
        NonNullable<PrismaJson.BookExtraProperties["physicalDetails"]>,
        { type: "published" }
      >
    | null = null;
  if (book.extraProperties.physicalDetails) {
    if (book.extraProperties.physicalDetails.type === "manuscript") {
      physicalDetails = {
        type: "manuscript",
        details: book.physicalDetails ?? "",
      };
    } else {
      physicalDetails = book.extraProperties.physicalDetails;
    }
  } else if (book.physicalDetails) {
    physicalDetails = {
      type: "manuscript",
      details: book.physicalDetails,
    };
  }

  return {
    id: book.id,
    slug: book.slug,
    coverImageUrl: book.coverImageUrl,
    arabicName: bookNames.ar,
    englishName: bookNames.en,
    transliteratedName: book.transliteration,
    otherNames: otherNames.ar,
    advancedGenres: book.advancedGenres.map((genre) => genre.id),
    author: {
      id: book.author.id,
      slug: book.author.slug,
      arabicName: authorNames.ar,
      transliteratedName: book.author.transliteration,
      diedYear: book.author.year,
    },
    versions,
    physicalDetails,
  };
};

export const deleteBookById = async (id: string, db: typeof usulDb) => {
  await db.$transaction(async (tx) => {
    const data = await tx.book.delete({
      select: {
        id: true,
        authorId: true,
        advancedGenres: { select: { id: true } },
        genres: { select: { id: true } },
      },
      where: { id },
    });

    await tx.author.update({
      where: { id: data.authorId },
      data: {
        numberOfBooks: {
          decrement: 1,
        },
      },
    });

    await tx.genre.updateMany({
      where: { id: { in: data.genres.map((genre) => genre.id) } },
      data: {
        numberOfBooks: {
          decrement: 1,
        },
      },
    });

    await tx.advancedGenre.updateMany({
      where: { id: { in: data.advancedGenres.map((genre) => genre.id) } },
      data: {
        numberOfBooks: {
          decrement: 1,
        },
      },
    });
  });
};
