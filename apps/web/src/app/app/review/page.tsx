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
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container>
        <DataTable columns={columns} data={data} />
      </Container>
    </main>
  );
}
