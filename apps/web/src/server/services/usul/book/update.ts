import type { usulDb } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma } from "@usul-ocr/usul-db";

import { createUniqueBookSlug } from "../book";
import { bookVersionSchema, prepareBookVersions } from "../book-versions";

export const updateBookSchema = z.object({
  id: z.string(),
  arabicName: z.string(),
  transliteratedName: z.string(),
  advancedGenres: z.array(z.string()),
  otherNames: z.array(z.string()).optional(),
  physicalDetails: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("published"),
        investigator: z.string().optional(),
        publisher: z.string().optional(),
        publisherLocation: z.string().optional(),
        editionNumber: z.string().optional(),
        publicationYear: z.number().optional(),
        notes: z.string().optional(),
      }),
      z.object({
        type: z.literal("manuscript"),
        notes: z.string().optional(),
      }),
    ])
    .nullable(),
  authorId: z.string(),
  versions: z.array(bookVersionSchema),
});

const areArraysEqual = <T>(a: T[], b: T[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

export const updateBook = async (
  data: z.infer<typeof updateBookSchema>,
  db: typeof usulDb,
) => {
  const currentBook = await db.book.findUnique({
    where: {
      id: data.id,
    },
    select: {
      id: true,
      transliteration: true,
      authorId: true,
      versions: true,
      genres: {
        select: {
          id: true,
        },
      },
      advancedGenres: {
        select: {
          id: true,
        },
      },
      primaryNameTranslations: {
        where: {
          locale: "ar",
        },
      },
    },
  });

  if (!currentBook) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Book not found",
    });
  }

  const arabicName = currentBook.primaryNameTranslations[0]?.text;

  const didAuthorChange = data.authorId !== currentBook.authorId;
  const didArabicNameChange = data.arabicName !== arabicName;
  const didTransliteratedNameChange =
    data.transliteratedName !== currentBook.transliteration;
  const didAdvancedGenresChange = !areArraysEqual(
    data.advancedGenres,
    currentBook.advancedGenres.map((g) => g.id),
  );

  // check if the new author exists
  if (didAuthorChange) {
    const newAuthor = await db.author.findUnique({
      where: {
        id: data.authorId,
      },
      select: { id: true },
    });

    if (!newAuthor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Author not found",
      });
    }
  }

  let simpleGenreIds: string[] | null;
  let removedAdvancedGenres: string[] | null;
  let addedAdvancedGenres: string[] | null;
  let removedSimpleGenres: string[] | null;
  let addedSimpleGenres: string[] | null;
  if (didAdvancedGenresChange) {
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

    simpleGenreIds = [
      ...new Set(
        advancedGenres
          .map((genre) => genre.extraProperties.simpleGenreId)
          .filter((id): id is string => !!id),
      ),
    ];

    removedAdvancedGenres = currentBook.advancedGenres
      .filter((genre) => !data.advancedGenres.includes(genre.id))
      .map((genre) => genre.id);
    addedAdvancedGenres = data.advancedGenres.filter(
      (genre) => !currentBook.advancedGenres.map((g) => g.id).includes(genre),
    );

    removedSimpleGenres = currentBook.genres
      .filter((genre) => !simpleGenreIds!.includes(genre.id))
      .map((genre) => genre.id);
    addedSimpleGenres = simpleGenreIds.filter(
      (genre) => !currentBook.genres.map((g) => g.id).includes(genre),
    );
  }

  let newSlug: string | null = null;
  if (didTransliteratedNameChange) {
    newSlug = await createUniqueBookSlug(data.transliteratedName, db, [
      currentBook.id,
    ]);
  }

  await db.$transaction(async (tx) => {
    if (addedAdvancedGenres) {
      await tx.advancedGenre.updateMany({
        where: {
          id: {
            in: addedAdvancedGenres,
          },
        },
        data: {
          numberOfBooks: {
            increment: 1,
          },
        },
      });
    }

    if (removedAdvancedGenres) {
      await tx.advancedGenre.updateMany({
        where: {
          id: {
            in: removedAdvancedGenres,
          },
        },
        data: {
          numberOfBooks: {
            decrement: 1,
          },
        },
      });
    }

    if (addedSimpleGenres) {
      await tx.genre.updateMany({
        where: {
          id: {
            in: addedSimpleGenres,
          },
        },
        data: {
          numberOfBooks: {
            increment: 1,
          },
        },
      });
    }

    if (removedSimpleGenres) {
      await tx.genre.updateMany({
        where: {
          id: {
            in: removedSimpleGenres,
          },
        },
        data: {
          numberOfBooks: {
            decrement: 1,
          },
        },
      });
    }

    if (didAuthorChange) {
      // decrement old author's number of books
      await tx.author.update({
        where: {
          id: currentBook.authorId,
        },
        data: {
          numberOfBooks: {
            decrement: 1,
          },
        },
      });

      // increment new author's number of books
      await tx.author.update({
        where: {
          id: data.authorId,
        },
        data: {
          numberOfBooks: {
            increment: 1,
          },
        },
      });
    }

    const versions = prepareBookVersions(data.versions, currentBook.versions);

    return tx.book.update({
      where: {
        id: data.id,
      },
      data: {
        ...(didArabicNameChange
          ? {
              primaryNameTranslations: {
                upsert: {
                  where: {
                    bookId_locale: {
                      bookId: data.id,
                      locale: "ar",
                    },
                  },
                  update: {
                    text: data.arabicName,
                  },
                  create: {
                    locale: "ar",
                    text: data.arabicName,
                  },
                },
              },
            }
          : {}),
        ...(didTransliteratedNameChange
          ? {
              transliteration: data.transliteratedName,
            }
          : {}),
        ...(data.otherNames
          ? {
              otherNameTranslations: {
                upsert: {
                  where: {
                    bookId_locale: {
                      bookId: data.id,
                      locale: "ar",
                    },
                  },
                  update: {
                    texts: data.otherNames,
                  },
                  create: {
                    locale: "ar",
                    texts: data.otherNames,
                  },
                },
              },
            }
          : {}),
        ...(newSlug ? { slug: newSlug } : {}),
        ...(simpleGenreIds && simpleGenreIds.length > 0
          ? {
              genres: {
                connect: simpleGenreIds.map((genre) => ({ id: genre })),
              },
            }
          : {}),
        ...(didAdvancedGenresChange && simpleGenreIds !== null
          ? {
              advancedGenres: {
                set: data.advancedGenres.map((genre) => ({ id: genre })),
              },
              genres: {
                set: simpleGenreIds.map((genre) => ({ id: genre })),
              },
            }
          : {}),

        ...(didAuthorChange
          ? {
              author: { connect: { id: data.authorId } },
            }
          : {}),
        versions: versions,
        numberOfVersions: versions.length,
        physicalDetails: data.physicalDetails
          ? data.physicalDetails
          : Prisma.DbNull,
      },
    });
  });

  return {
    id: currentBook.id,
    didArabicNameChange,
    didAuthorChange,
  };
};
