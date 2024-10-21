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

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams;
}) {
  const query = getQuery(searchParams);
  const pagination = getPagination(searchParams);

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
    }),
  ]);

  const preparedBooks = authors.map((author) => {
    const titles: Record<string, string> = {};
    author.primaryNameTranslations.forEach((t) => {
      titles[t.locale] = t.text;
    });

    return {
      id: author.id,
      slug: author.slug,
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
      <SearchBar />
      <DefaultDataTable
        columns={columns}
        data={preparedBooks}
        totalItems={count}
      />
    </PageLayout>
  );
}
