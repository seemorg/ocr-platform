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

export default async function RegionsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams;
}) {
  const query = getQuery(searchParams);
  const pagination = getPagination(searchParams);

  let filter: Prisma.RegionWhereInput | undefined;
  if (query) {
    filter = {
      OR: [
        {
          nameTranslations: {
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

  const [total, regions] = await Promise.all([
    usulDb.region.count({ where: filter }),
    usulDb.region.findMany({
      where: filter,
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

  const preparedData = regions.map((region) => {
    const names: Record<string, string> = {};
    region.nameTranslations.forEach((n) => {
      names[n.locale] = n.text;
    });

    return {
      id: region.id,
      slug: region.slug,
      arabicName: names.ar,
      englishName: names.en,
      numberOfBooks: region.numberOfBooks,
    };
  });

  return (
    <PageLayout
      title="Regions"
      backHref="/usul"
      actions={
        <Button asChild className="mb-5">
          <Link href="/usul/regions/add">Add Region</Link>
        </Button>
      }
    >
      <SearchBar />
      <DefaultDataTable
        columns={columns}
        data={preparedData}
        totalItems={total}
      />
    </PageLayout>
  );
}
