import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { getUserGroupIdsAndRole } from "@/server/services/user";

import { UserRole } from "@usul-ocr/db";

import { columns, Page } from "./columns";
import { DataTable } from "./data-table";
import TotalWords from "./total-words";



async function getData(bookId: string): Promise<{
  book: {
    arabicName: string | null;
    englishName: string | null;
  };
  pages: Page[];
}> {
  const session = await getServerAuthSession()!;
  const user = await getUserGroupIdsAndRole(session!.user.id);

  if (!user) {
    throw new Error("User not found");
  }

  const [book, users] = await Promise.all([
    db.book.findUnique({
      where: {
        id: bookId,
        ...(user?.role === UserRole.ADMIN
          ? {}
          : {
            Group: {
              id: {
                in: user?.groupIds,
              },
            },
          }),
      },
      select: {
        arabicName: true,
        englishName: true,
        Page: {
          select: {
            id: true,
            bookId: true,
            pageNumber: true,
            pdfPageNumber: true,
            reviewedAt: true,
            reviewedById: true,
            totalWords: true,
          },
        },
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
    pages: book!.Page.map((page) => ({
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
      <TotalWords bookId={bookId} />
      <DataTable columns={columns} data={data.pages} />
    </PageLayout>
  );
}
