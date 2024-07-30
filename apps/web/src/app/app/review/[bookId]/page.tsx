import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { db } from "@/server/db";

import { columns, Page } from "./columns";
import { DataTable } from "./data-table";

async function getData(bookId: string): Promise<Page[]> {
  const pages = await db.page.findMany({
    where: {
      bookId,
    },
    select: {
      id: true,
      bookId: true,
      pageNumber: true,
      pdfPageNumber: true,
      reviewedAt: true,
      reviewedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return pages.map((page) => ({
    id: page.id,
    bookId: page.bookId,
    pageNumber: page.pageNumber,
    pdfPageNumber: page.pdfPageNumber,
    reviewedAt: page.reviewedAt,
    reviewer: page.reviewedBy
      ? {
          id: page.reviewedBy.id,
          email: page.reviewedBy.email!,
        }
      : null,
  }));
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
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container>
        <Button asChild>
          <Link href="/app/review">Return to All Books</Link>
        </Button>

        <DataTable columns={columns} data={data} />
      </Container>
    </main>
  );
}
