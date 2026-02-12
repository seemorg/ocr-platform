import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { DefaultDataTable } from "@/components/tables/default";
import { Button } from "@/components/ui/button";
import { getPagination, getQuery } from "@/lib/pagination";
import { usulDb } from "@/server/db";
import { PaginationSearchParams } from "@/types/pagination";

import type { Prisma } from "@usul-ocr/usul-db";

import { SearchBar } from "../search-bar";
import { columns } from "./columns";
import { Filter } from "./filter";

export const dynamic = "force-dynamic";

export default async function TextsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams & {
    genre?: string;
    advancedGenre?: string;
    empire?: string;
    region?: string;
    excludeEmptyAdvancedGenre?: "true" | "false";
  };
}) {
  const query = getQuery(searchParams);
  const pagination = getPagination(searchParams);

  let filter: Prisma.BookWhereInput | undefined;
  if (query) {
    filter = {
      OR: [
        {
          primaryNameTranslations: {
            some: {
              text:
                query.mode === "contains"
                  ? { contains: query.text, mode: "insensitive" }
                  : { equals: query.text },
            },
          },
        },
        {
          slug:
            query.mode === "contains"
              ? { contains: query.text, mode: "insensitive" }
              : { equals: query.text },
        },
        {
          transliteration:
            query.mode === "contains"
              ? { contains: query.text, mode: "insensitive" }
              : { equals: query.text },
        },
      ],
    };
  }

  if (searchParams.advancedGenre) {
    filter = {
      ...(filter ?? {}),
      AdvancedGenreToBook: {
        some: { A: searchParams.advancedGenre },
      },
    };
  }

  if (searchParams.genre) {
    filter = {
      ...(filter ?? {}),
      BookToGenre: {
        some: { B: searchParams.genre },
      },
    };
  }

  if (searchParams.excludeEmptyAdvancedGenre === "true") {
    filter = {
      ...(filter ?? {}),
      AdvancedGenreToBook: {
        none: {},
      },
    };
  }

  if (searchParams.empire || searchParams.region) {
    const authorFilter: any = {};

    if (searchParams.empire) {
      authorFilter.AuthorToEmpire = {
        some: { B: searchParams.empire },
      };
    }

    if (searchParams.region) {
      authorFilter.AuthorToRegion = {
        some: { B: searchParams.region },
      };
    }

    filter = {
      ...(filter ?? {}),
      author: authorFilter,
    };
  }

  const [count, books] = await Promise.all([
    usulDb.book.count({
      where: filter,
    }),
    usulDb.book.findMany({
      where: filter,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        versions: true,
        primaryNameTranslations: {
          where: {
            OR: [{ locale: "ar" }, { locale: "en" }],
          },
        },
        AdvancedGenreToBook: {
          select: {
            AdvancedGenre: {
              select: {
                id: true,
                nameTranslations: {
                  where: {
                    locale: "ar",
                  },
                },
              },
            },
          },
        },
        BookToGenre: {
          select: {
            Genre: {
              select: {
                id: true,
                nameTranslations: {
                  where: {
                    locale: "ar",
                  },
                },
              },
            },
          },
        },
        author: {
          include: {
            primaryNameTranslations: {
              where: {
                OR: [{ locale: "ar" }, { locale: "en" }],
              },
            },
            AuthorToEmpire: {
              select: {
                Empire: {
                  select: {
                    id: true,
                    EmpireName: {
                      where: {
                        locale: "ar",
                      },
                    },
                  },
                },
              },
            },
            AuthorToRegion: {
              select: {
                Region: {
                  select: {
                    id: true,
                    nameTranslations: {
                      where: {
                        locale: "ar",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
  ]);

  const preparedBooks = books.map((book) => {
    const titles: Record<string, string> = {};
    book.primaryNameTranslations.forEach((t) => {
      titles[t.locale] = t.text;
    });

    const authorNames: Record<string, string> = {};
    book.author.primaryNameTranslations.forEach((n) => {
      authorNames[n.locale] = n.text;
    });

    return {
      id: book.id,
      arabicName: titles.ar,
      englishName: titles.en,
      arabicAuthorName: authorNames.ar,
      englishAuthorName: authorNames.en,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      genres: book.BookToGenre.map((relation) => ({
        id: relation.Genre.id,
        arabicName: relation.Genre.nameTranslations[0]?.text,
      })),
      advancedGenres: book.AdvancedGenreToBook.map((relation) => ({
        id: relation.AdvancedGenre.id,
        arabicName: relation.AdvancedGenre.nameTranslations[0]?.text,
      })),
      empires: book.author.AuthorToEmpire.map((relation) => ({
        id: relation.Empire.id,
        arabicName: relation.Empire.EmpireName[0]?.text,
      })),
      regions: book.author.AuthorToRegion.map((relation) => ({
        id: relation.Region.id,
        arabicName: relation.Region.nameTranslations[0]?.text,
      })),
      versions: Array.from(new Set(book.versions.map((v) => v.source))).sort(),
    };
  });

  return (
    <PageLayout
      title="Texts"
      backHref="/usul"
      actions={
        <Button asChild className="mb-5">
          <Link href="/usul/texts/add">Add Text</Link>
        </Button>
      }
    >
      <div className="mb-5 flex flex-col">
        <SearchBar className="mb-0" />
        <Filter />
      </div>
      <DefaultDataTable
        columns={columns}
        data={preparedBooks}
        totalItems={count}
      />
    </PageLayout>
  );
}
