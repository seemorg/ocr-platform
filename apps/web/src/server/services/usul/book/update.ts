import type { usulDb } from "@/server/db";
import { purgeApiSlugsCache } from "@/lib/usul-pipeline";
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
        publicationYear: z.string().optional(),
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
      slug: true,
      versions: true,
      BookToGenre: {
        select: {
          Genre: {
            select: {
              id: true,
            },
          },
        },
      },
      AdvancedGenreToBook: {
        select: {
          AdvancedGenre: {
            select: {
              id: true,
            },
          },
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
    currentBook.AdvancedGenreToBook.map((relation) => relation.AdvancedGenre.id),
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

    removedAdvancedGenres = currentBook.AdvancedGenreToBook
      .filter(
        (relation) => !data.advancedGenres.includes(relation.AdvancedGenre.id),
      )
      .map((relation) => relation.AdvancedGenre.id);
    addedAdvancedGenres = data.advancedGenres.filter(
      (genre) =>
        !currentBook.AdvancedGenreToBook.map(
          (relation) => relation.AdvancedGenre.id,
        ).includes(genre),
    );

    removedSimpleGenres = currentBook.BookToGenre
      .filter(
        (relation) => !simpleGenreIds!.includes(relation.Genre.id),
      )
      .map((relation) => relation.Genre.id);
    addedSimpleGenres = simpleGenreIds.filter(
      (genre) =>
        !currentBook.BookToGenre.map((relation) => relation.Genre.id).includes(
          genre,
        ),
    );
  }

  let newSlug: string | null = null;
  if (didTransliteratedNameChange) {
    newSlug = await createUniqueBookSlug(data.transliteratedName, db, [
      currentBook.id,
    ]);
  }

  const newBook = await db.$transaction(async (tx) => {
    if (addedAdvancedGenres && addedAdvancedGenres.length > 0) {
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

    if (removedAdvancedGenres && removedAdvancedGenres.length > 0) {
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

    if (addedSimpleGenres && addedSimpleGenres.length > 0) {
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

    if (removedSimpleGenres && removedSimpleGenres.length > 0) {
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

    // Handle AdvancedGenreToBook relation updates
    if (didAdvancedGenresChange) {
      // Delete existing advanced genre connections
      await tx.advancedGenreToBook.deleteMany({
        where: { B: data.id },
      });

      // Create new advanced genre connections
      if (data.advancedGenres.length > 0) {
        await tx.advancedGenreToBook.createMany({
          data: data.advancedGenres.map((genreId) => ({
            A: genreId,
            B: data.id,
          })),
        });
      }
    }

    // Handle BookToGenre relation updates
    if (didAdvancedGenresChange && simpleGenreIds !== null) {
      // Delete existing genre connections
      await tx.bookToGenre.deleteMany({
        where: { A: data.id },
      });

      // Create new genre connections
      if (simpleGenreIds.length > 0) {
        await tx.bookToGenre.createMany({
          data: simpleGenreIds.map((genreId) => ({
            A: data.id,
            B: genreId,
          })),
        });
      }
    } else if (addedSimpleGenres && addedSimpleGenres.length > 0) {
      // Only add new connections if not doing a full replace
      await tx.bookToGenre.createMany({
        data: addedSimpleGenres.map((genreId) => ({
          A: data.id,
          B: genreId,
        })),
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
        ...(data.otherNames !== undefined
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

  // add old slug as alternative slug
  if (newBook.slug !== currentBook.slug) {
    try {
      await db.bookAlternateSlug.create({
        data: {
          book: { connect: { id: newBook.id } },
          slug: currentBook.slug,
        },
      });
      await purgeApiSlugsCache();
    } catch (e) {
      console.log(e);
    }
  }

  return {
    id: currentBook.id,
    didArabicNameChange,
    didAuthorChange,
  };
};
