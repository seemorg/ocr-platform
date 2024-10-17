import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { DefaultDataTable } from "@/components/tables/default";
import { Button } from "@/components/ui/button";
import { getPagination } from "@/lib/pagination";
import { usulDb } from "@/server/db";
import { PaginationSearchParams } from "@/types/pagination";

import { columns } from "./columns";

export default async function TextsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams;
}) {
  const pagination = getPagination(searchParams);

  const [count, books] = await Promise.all([
    usulDb.book.count({}),
    usulDb.book.findMany({
      include: {
        primaryNameTranslations: {
          where: {
            OR: [{ locale: "ar" }, { locale: "en" }],
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
      slug: book.slug,
      arabicName: titles.ar,
      englishName: titles.en,
      arabicAuthorName: authorNames.ar,
      englishAuthorName: authorNames.en,
    };
  });

  return (
    <PageLayout title="Texts" backHref="/usul">
      <Button asChild className="mb-5">
        <Link href="/usul/texts/add">Add Text</Link>
      </Button>

      <DefaultDataTable
        columns={columns}
        data={preparedBooks}
        totalItems={count}
      />
    </PageLayout>
  );
}
