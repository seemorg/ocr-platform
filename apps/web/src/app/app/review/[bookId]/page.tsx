import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { db } from "@/server/db";

import { columns, Page } from "./columns";
import { DataTable } from "./data-table";

async function getData(bookId: string): Promise<{
  book: {
    arabicName: string | null;
    englishName: string | null;
  };
  pages: Page[];
}> {
  const [book, pages, users] = await Promise.all([
    db.book.findUnique({
      where: {
        id: bookId,
      },
      select: {
        arabicName: true,
        englishName: true,
      },
    }),
    db.page.findMany({
      where: {
        bookId,
      },
      select: {
        id: true,
        bookId: true,
        pageNumber: true,
        pdfPageNumber: true,
        reviewedAt: true,
        reviewedById: true,
      },
    }),
    db.user.findMany({
      select: {
        id: true,
        email: true,
      },
    }),
  ]);

  const userIdToEmail = users.reduce(
    (acc, user) => {
      acc[user.id] = user.email;
      return acc;
    },
    {} as Record<string, string | null>,
  );

  return {
    book: book!,
    pages: pages.map((page) => ({
      ...page,
      reviewer: page.reviewedById
        ? {
            id: page.reviewedById,
            email: userIdToEmail[page.reviewedById] as string,
          }
        : null,
    })),
  };
}

export default async function BookPagesPage({
  params: { bookId },
}: {
  params: {
    bookId: string;
  };
}) {
  const data = await getData(bookId);

  return (
    <PageLayout
      title={
        <>
          {data.book.arabicName ?? data.book.englishName}
          <Link href="/app/review">
            <Button size="sm" className="ml-4">
              All Books
            </Button>
          </Link>
        </>
      }
    >
      <DataTable columns={columns} data={data.pages} />
    </PageLayout>
  );
}
