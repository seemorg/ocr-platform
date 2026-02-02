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

export const dynamic = "force-dynamic";

export default async function EmpiresPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams;
}) {
  const query = getQuery(searchParams);
  const pagination = getPagination(searchParams);

  let filter: Prisma.EmpireWhereInput | undefined;
  if (query) {
    filter = {
      OR: [
        {
          EmpireName: {
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

  const [total, empires] = await Promise.all([
    usulDb.empire.count({ where: filter }),
    usulDb.empire.findMany({
      where: filter,
      include: {
        EmpireName: {
          where: {
            OR: [{ locale: "ar" }, { locale: "en" }],
          },
        },
      },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
  ]);

  const preparedData = empires.map((empire) => {
    const names: Record<string, string> = {};
    empire.EmpireName.forEach((n) => {
      names[n.locale] = n.text;
    });

    return {
      id: empire.id,
      slug: empire.slug,
      arabicName: names.ar,
      englishName: names.en,
      numberOfBooks: empire.numberOfBooks,
    };
  });

  return (
    <PageLayout
      title="Empires & Eras"
      backHref="/usul"
      actions={
        <Button asChild className="mb-5">
          <Link href="/usul/empires/add">Add Empire & Era</Link>
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
