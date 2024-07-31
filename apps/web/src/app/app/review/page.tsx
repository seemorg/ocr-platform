import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { db } from "@/server/db";

import { Book, columns } from "./columns";
import { DataTable } from "./data-table";

async function getData(): Promise<Book[]> {
  const books = await db.book.findMany({
    include: {
      author: true,
    },
  });

  return books.map((book) => ({
    id: book.id,
    arabicName: book.arabicName,
    englishName: book.englishName,
    status: book.status,
    author: {
      id: book.author.id,
      arabicName: book.author.arabicName,
      englishName: book.author.englishName,
    },
    pdfUrl: book.pdfUrl,
    totalPages: book.totalPages,
    reviewedPages: book.reviewedPages,
  }));
}

export default async function DemoPage() {
  const data = await getData();

  return (
    <PageLayout
      title={
        <>
          All Books{" "}
          <Link href="/app/review/new" className="ml-4">
            <Button size="sm">New Book</Button>
          </Link>
        </>
      }
    >
      <DataTable columns={columns} data={data} />
    </PageLayout>
  );
}
