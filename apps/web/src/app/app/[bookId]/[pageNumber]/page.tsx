import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";

// import { defaultServerExtensions } from "@/components/tailwind-editor/server-extensions";
// import { generateJSON } from "@tiptap/html";

import ClientAppPage from "./client";

export default async function AppPage({
  params: { bookId, pageNumber },
}: {
  params: {
    bookId: string;
    pageNumber: string;
  };
}) {
  const session = await getServerAuthSession();

  // get the first page that needs review
  const page = await db.page.findFirst({
    where: {
      bookId,
      pdfPageNumber: Number(pageNumber),
    },
    include: {
      book: true,
      reviewedBy: { select: { email: true } },
    },
  });

  if (!page || !page.book) {
    return <div>No page to review</div>;
  }

  return <ClientAppPage page={page} session={session!} />;
}
