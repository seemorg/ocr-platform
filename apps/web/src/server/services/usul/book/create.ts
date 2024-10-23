import type { usulDb } from "@/server/db";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createUniqueAuthorSlug, getAuthor } from "../author";
import { createUniqueBookSlug } from "../book";
import { bookVersionSchema, prepareBookVersions } from "../book-versions";

export const createBookSchema = z.object({
  _airtableReference: z.string().optional(),
  arabicName: z.string(),
  transliteratedName: z.string(),
  slug: z.string().optional(),
  advancedGenres: z.array(z.string()),
  otherNames: z.array(z.string()).optional(),
  physicalDetails: z.string().optional(),
  author: z.discriminatedUnion("isUsul", [
    z.object({
      isUsul: z.literal(true),
      slug: z.string(),
    }),
    z.object({
      isUsul: z.literal(false),
      _airtableReference: z.string(),
      arabicName: z.string(),
      transliteratedName: z.string(),
      diedYear: z.number().optional(),
    }),
  ]),
  versions: z.array(bookVersionSchema),
});

export const createBook = async (
  data: z.infer<typeof createBookSchema>,
  db: typeof usulDb,
) => {
  if (data._airtableReference) {
    const book = await db.book.findFirst({
      where: {
        extraProperties: {
          path: ["_airtableReference"],
          equals: data._airtableReference,
        },
      },
      select: {
        id: true,
      },
    });

    if (book) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Book already exists",
      });
    }
  }

  let newAuthorParams: {
    slug: string;
    arabicName: string;
  } | null = null;
  let authorArabicName: string;
  let authorId: string;

  let shouldCreateAuthor = false;

  if (data.author.isUsul) {
    const author = await getAuthor({ slug: data.author.slug }, db);
    if (!author) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Author not found",
      });
    }

    authorArabicName = author.name;
    authorId = author.id;
  } else {
    const author = await getAuthor(
      { _airtableReference: data.author._airtableReference },
      db,
    );

    if (author) {
      authorId = author.id;
      authorArabicName = author.name;
    } else {
      shouldCreateAuthor = true;
    }
  }

  const advancedGenres = await db.advancedGenre.findMany({
    where: {
      id: {
        in: data.advancedGenres,
      },
    },
    select: {
      id: true,
      extraProperties: true,
    },
  });

  const simpleGenreIds = [
    ...new Set(
      advancedGenres
        .map((genre) => genre.extraProperties.simpleGenreId)
        .filter((id): id is string => !!id),
    ),
  ];

  let slug;
  if (data.slug) {
    slug = data.slug;
  } else {
    slug = await createUniqueBookSlug(data.transliteratedName, db);
  }

  let authorSlug: string | undefined;
  if (shouldCreateAuthor) {
    authorSlug = await createUniqueAuthorSlug(
      (data.author as Extract<typeof data.author, { isUsul: false }>)
        .transliteratedName,
      db,
    );
  }

  await db.$transaction(async (tx) => {
    await tx.advancedGenre.updateMany({
      where: {
        id: {
          in: advancedGenres.map((genre) => genre.id),
        },
      },
      data: {
        numberOfBooks: {
          increment: 1,
        },
      },
    });

    await tx.genre.updateMany({
      where: {
        id: {
          in: simpleGenreIds,
        },
      },
      data: {
        numberOfBooks: {
          increment: 1,
        },
      },
    });

    if (!shouldCreateAuthor) {
      await tx.author.update({
        where: {
          id: authorId,
        },
        data: {
          numberOfBooks: {
            increment: 1,
          },
        },
      });
    } else {
      const validatedAuthor = data.author as Extract<
        typeof data.author,
        { isUsul: false }
      >;
      const newAuthor = await tx.author.create({
        data: {
          id: createId(),
          slug: authorSlug!,
          primaryNameTranslations: {
            create: {
              locale: "ar",
              text: validatedAuthor.arabicName,
            },
          },
          transliteration: validatedAuthor.transliteratedName,
          year: validatedAuthor.diedYear ?? -1,
          extraProperties: {
            _airtableReference: validatedAuthor._airtableReference,
          },
          numberOfBooks: 1,
        },
      });

      newAuthorParams = {
        slug: newAuthor.slug,
        arabicName: validatedAuthor.arabicName,
      };
      authorArabicName = validatedAuthor.arabicName;
      authorId = newAuthor.id;
    }

    const versions = prepareBookVersions(data.versions);

    return tx.book.create({
      select: { id: true },
      data: {
        id: createId(),
        primaryNameTranslations: {
          create: {
            locale: "ar",
            text: data.arabicName,
          },
        },
        otherNameTranslations: {
          create: {
            locale: "ar",
            texts: data.otherNames,
          },
        },
        transliteration: data.transliteratedName,
        slug,
        ...(simpleGenreIds.length > 0
          ? {
              genres: {
                connect: simpleGenreIds.map((genre) => ({ id: genre })),
              },
            }
          : {}),
        advancedGenres: {
          connect: advancedGenres.map((genre) => ({ id: genre.id })),
        },
        author: { connect: { id: authorId } },
        versions,
        numberOfVersions: versions.length,
        physicalDetails: data.physicalDetails,
        ...(data._airtableReference
          ? {
              extraProperties: {
                _airtableReference: data._airtableReference,
              },
            }
          : {}),
      },
    });
  });

  return {
    book: {
      slug,
      arabicName: data.arabicName,
      authorArabicName: authorArabicName!,
    },
    newAuthor: newAuthorParams!,
  };
};
