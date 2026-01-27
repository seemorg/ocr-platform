import type { usulDb } from "@/server/db";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AuthorYearStatus, Prisma } from "@usul-ocr/usul-db";

import { createUniqueAuthorSlug, getAuthor } from "../author";
import { createUniqueBookSlug } from "../book";
import { bookVersionSchema, prepareBookVersions } from "../book-versions";

export const createBookSchema = z.object({
  _airtableReference: z.string().optional(),
  arabicName: z.string(),
  otherNames: z.array(z.string()).optional(),
  transliteratedName: z.string(),
  slug: z.string().optional(),
  advancedGenres: z.array(z.string()),
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
  author: z.discriminatedUnion("isUsul", [
    z.object({
      isUsul: z.literal(true),
      slug: z.string(),
    }),
    z.object({
      isUsul: z.literal(false),
      _airtableReference: z.string().optional(),
      arabicName: z.string(),
      otherNames: z.array(z.string()).optional(),
      transliteratedName: z.string(),
      diedYear: z.number().optional(),
      yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
      arabicBio: z.string().optional(),
      empires: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
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
    const author = data.author._airtableReference
      ? await getAuthor(
        { _airtableReference: data.author._airtableReference },
        db,
      )
      : null;

    if (author) {
      authorId = author.id;
      authorArabicName = author.name;
    } else {
      shouldCreateAuthor = true;

      if (!data.author.yearStatus && !data.author.diedYear) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Author death year or year status is required",
        });
      }
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

      // Update empire counts
      if (validatedAuthor.empires && validatedAuthor.empires.length > 0) {
        await tx.empire.updateMany({
          where: {
            id: {
              in: validatedAuthor.empires,
            },
          },
          data: {
            numberOfAuthors: {
              increment: 1,
            },
            numberOfBooks: {
              increment: 1,
            },
          },
        });
      }

      // Update region counts
      if (validatedAuthor.regions && validatedAuthor.regions.length > 0) {
        await tx.region.updateMany({
          where: {
            id: {
              in: validatedAuthor.regions,
            },
          },
          data: {
            numberOfAuthors: {
              increment: 1,
            },
            numberOfBooks: {
              increment: 1,
            },
          },
        });
      }

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
          ...(validatedAuthor.otherNames
            ? {
              otherNameTranslations: {
                create: {
                  locale: "ar",
                  texts: validatedAuthor.otherNames,
                },
              },
            }
            : {}),
          transliteration: validatedAuthor.transliteratedName,
          year: validatedAuthor.diedYear,
          yearStatus: validatedAuthor.yearStatus,
          ...(validatedAuthor.arabicBio
            ? {
              bioTranslations: {
                create: { locale: "en", text: validatedAuthor.arabicBio },
              },
            }
            : {}),
          extraProperties: {
            _airtableReference: validatedAuthor._airtableReference,
          },
          numberOfBooks: 1,
          ...(validatedAuthor.empires && validatedAuthor.empires.length > 0
            ? {
              empires: {
                connect: validatedAuthor.empires.map((id) => ({ id })),
              },
            }
            : {}),
          ...(validatedAuthor.regions && validatedAuthor.regions.length > 0
            ? {
              regions: {
                connect: validatedAuthor.regions.map((id) => ({ id })),
              },
            }
            : {}),
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
            BookToGenre: {
              create: simpleGenreIds.map((genreId) => ({
                Genre: {
                  connect: { id: genreId },
                },
              })),
            },
          }
          : {}),
        AdvancedGenreToBook: {
          create: advancedGenres.map((genre) => ({
            AdvancedGenre: {
              connect: { id: genre.id },
            },
          })),
        },
        author: { connect: { id: authorId } },
        versions,
        numberOfVersions: versions.length,
        physicalDetails: data.physicalDetails
          ? data.physicalDetails
          : Prisma.DbNull,
        extraProperties: {
          ...(data._airtableReference
            ? {
              _airtableReference: data._airtableReference,
            }
            : {}),
        },
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
