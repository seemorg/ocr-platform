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

export default async function TextsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams & {
    genre?: string;
    advancedGenre?: string;
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
      advancedGenres: {
        some: { id: searchParams.advancedGenre },
      },
    };
  }

  if (searchParams.genre) {
    filter = {
      ...(filter ?? {}),
      genres: {
        some: { id: searchParams.genre },
      },
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
        primaryNameTranslations: {
          where: {
            OR: [{ locale: "ar" }, { locale: "en" }],
          },
        },
        advancedGenres: {
          select: {
            id: true,
            nameTranslations: {
              where: {
                locale: "ar",
              },
            },
          },
        },
        genres: {
          select: {
            id: true,
            nameTranslations: {
              where: {
                locale: "ar",
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
          },
        },
      },
      orderBy: [
        {
          createdAt: "desc",
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
      genres: book.genres.map((g) => ({
        id: g.id,
        arabicName: g.nameTranslations[0]?.text,
      })),
      advancedGenres: book.advancedGenres.map((g) => ({
        id: g.id,
        arabicName: g.nameTranslations[0]?.text,
      })),
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
      <SearchBar />
      <DefaultDataTable
        columns={columns}
        data={preparedBooks}
        totalItems={count}
      />
    </PageLayout>
  );
}
