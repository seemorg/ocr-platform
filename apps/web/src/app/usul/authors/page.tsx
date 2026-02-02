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
import { Filter } from "./filter";
import { AuthorSort } from "./sort";
import { YearSearchBar } from "./year-search";

export const dynamic = "force-dynamic";

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: PaginationSearchParams & {
    sort?: "year-asc" | "year-desc";
    year?: string;
    region?: string;
    empire?: string;
    showWithoutRegion?: "true" | "false";
    showWithoutEmpire?: "true" | "false";
  };
}) {
  const query = getQuery(searchParams);
  const pagination = getPagination(searchParams);

  const sort = searchParams.sort;
  const year = searchParams.year;
  let yearNumber: number | undefined;
  if (year && !isNaN(parseInt(year))) {
    yearNumber = parseInt(year);
  }

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

  if (yearNumber !== undefined) {
    filter = {
      ...(filter ?? {}),
      year: { equals: yearNumber },
    };
  }

  // Region filter - "show without" takes precedence
  if (searchParams.showWithoutRegion === "true") {
    filter = {
      ...(filter ?? {}),
      AuthorToRegion: {
        none: {},
      },
    };
  } else if (searchParams.region) {
    filter = {
      ...(filter ?? {}),
      AuthorToRegion: {
        some: { B: searchParams.region },
      },
    };
  }

  // Empire filter - "show without" takes precedence
  if (searchParams.showWithoutEmpire === "true") {
    filter = {
      ...(filter ?? {}),
      AuthorToEmpire: {
        none: {},
      },
    };
  } else if (searchParams.empire) {
    filter = {
      ...(filter ?? {}),
      AuthorToEmpire: {
        some: { B: searchParams.empire },
      },
    };
  }

  const [count, authors] = await Promise.all([
    usulDb.author.count({
      where: filter,
    }),
    usulDb.author.findMany({
      where: filter,
      include: {
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
      regions: author.AuthorToRegion.map((r) => ({
        id: r.Region.id,
        arabicName: r.Region.nameTranslations[0]?.text,
      })),
      empires: author.AuthorToEmpire.map((e) => ({
        id: e.Empire.id,
        arabicName: e.Empire.EmpireName[0]?.text,
      })),
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
      <div className=" flex items-start justify-between">
        <div className="flex items-center gap-4">
          <SearchBar className="mb-0 min-w-[500px]" />
          <YearSearchBar />
        </div>

        <AuthorSort />
      </div>
      <div className="mb-5 flex flex-col">
        <Filter />
      </div>
      <DefaultDataTable
        columns={columns}
        data={preparedAuthors}
        totalItems={count}
      />
    </PageLayout>
  );
}
