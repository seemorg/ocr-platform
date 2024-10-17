import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { DefaultDataTable } from "@/components/tables/default";
import { Button } from "@/components/ui/button";
import { getPagination } from "@/lib/pagination";
import { usulDb } from "@/server/db";
import { PaginationSearchParams } from "@/types/pagination";

import { columns } from "./columns";

export default async function AdvancedGenresPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams;
}) {
  const pagination = getPagination(searchParams);

  const [count, genres] = await Promise.all([
    usulDb.advancedGenre.count({}),
    usulDb.advancedGenre.findMany({
      include: {
        nameTranslations: {
          where: {
            OR: [{ locale: "ar" }, { locale: "en" }],
          },
        },
      },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
  ]);

  const preparedData = genres.map((genre) => {
    const names: Record<string, string> = {};
    genre.nameTranslations.forEach((n) => {
      names[n.locale] = n.text;
    });

    return {
      id: genre.id,
      slug: genre.slug,
      arabicName: names.ar,
      englishName: names.en,
      numberOfBooks: genre.numberOfBooks,
    };
  });

  return (
    <PageLayout title="Advanced Genres" backHref="/usul">
      <Button asChild className="mb-5">
        <Link href="/usul/advanced-genres/add">Add Advanced Genre</Link>
      </Button>

      <DefaultDataTable
        columns={columns}
        data={preparedData}
        totalItems={count}
      />
    </PageLayout>
  );
}
