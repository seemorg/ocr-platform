import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { DefaultDataTable } from "@/components/tables/default";
import { Button } from "@/components/ui/button";
import { getPagination, getQuery } from "@/lib/pagination";
import { usulDb } from "@/server/db";
import { PaginationSearchParams } from "@/types/pagination";

import { Prisma } from "@usul-ocr/usul-db";

import { SearchBar } from "../search-bar";
import { columns } from "./columns";
import { AuthorSort } from "./sort";

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams & {
    sort?: "year-asc" | "year-desc";
  };
}) {
  const query = getQuery(searchParams);
  const pagination = getPagination(searchParams);

  const sort = searchParams.sort;

  let filter: Prisma.AuthorWhereInput | undefined;
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
          transliteration:
            query.mode === "contains"
              ? { contains: query.text, mode: "insensitive" }
              : { equals: query.text },
        },
        {
          slug:
            query.mode === "contains"
              ? { contains: query.text, mode: "insensitive" }
              : { equals: query.text },
        },
      ],
    };
  }

  const [count, authors] = await Promise.all([
    usulDb.author.count({
      where: filter,
    }),
    usulDb.author.findMany({
      where: filter,
      include: {
        primaryNameTranslations: {
          where: {
            OR: [{ locale: "ar" }, { locale: "en" }],
          },
        },
      },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: [
        ...(sort
          ? [
              {
                year:
                  sort === "year-asc"
                    ? Prisma.SortOrder.asc
                    : Prisma.SortOrder.desc,
              },
            ]
          : []),
        {
          createdAt: Prisma.SortOrder.desc,
        },
      ],
    }),
  ]);

  const preparedAuthors = authors.map((author) => {
    const titles: Record<string, string> = {};
    author.primaryNameTranslations.forEach((t) => {
      titles[t.locale] = t.text;
    });

    return {
      id: author.id,
      slug: author.slug,
      year: author.year,
      yearStatus: author.yearStatus,
      arabicName: titles.ar,
      englishName: titles.en,
      numberOfBooks: author.numberOfBooks,
    };
  });

  return (
    <PageLayout
      title="Authors"
      backHref="/usul"
      actions={
        <Button asChild className="mb-5">
          <Link href="/usul/authors/add">Add Author</Link>
        </Button>
      }
    >
      <div className="mb-10 flex items-start justify-between">
        <SearchBar className="mb-0 min-w-[500px]" />
        <AuthorSort />
      </div>
      <DefaultDataTable
        columns={columns}
        data={preparedAuthors}
        totalItems={count}
      />
    </PageLayout>
  );
}
