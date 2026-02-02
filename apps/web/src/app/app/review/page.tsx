import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { getUserGroupIdsAndRole } from "@/server/services/user";

import { UserRole } from "@usul-ocr/db";

import { Book, columns } from "./columns";
import { DataTable } from "./data-table";

export const dynamic = "force-dynamic";

async function getData(): Promise<Book[]> {
  const session = await getServerAuthSession();
  const user = await getUserGroupIdsAndRole(session!.user.id);

  if (user?.groupIds?.length === 0) return [];

  const books = await db.book.findMany({
    where:
      user?.role === UserRole.ADMIN
        ? {}
        : {
          Group: {
            id: {
              in: user?.groupIds,
            },
          },
        },
    select: {
      id: true,
      arabicName: true,
      englishName: true,
      status: true,
      pdfUrl: true,
      totalPages: true,
      reviewedPages: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          arabicName: true,
          englishName: true,
        },
      },
    },
  });

  return books;
}

export default async function BooksPage() {
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
