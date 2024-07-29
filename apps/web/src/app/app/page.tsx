import { redirect } from "next/navigation";
import { db } from "@/server/db";

export default async function AppPage() {
  const page = await db.page.findFirst({
    where: {
      reviewed: false,
    },
    select: {
      id: true,
      bookId: true,
      pdfPageNumber: true,
    },
  });

  if (!page) {
    return <div>No page to review</div>;
  }

  redirect(`/app/${page.bookId}/${page.pdfPageNumber}`);
}
