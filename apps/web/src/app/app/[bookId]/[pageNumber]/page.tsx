import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { getUserGroupIdsAndRole } from "@/server/services/user";

import { UserRole } from "@usul-ocr/db";

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
  const user = await getUserGroupIdsAndRole(session!.user.id);

  // get the first page that needs review
  const page = await db.page.findFirst({
    where: {
      pdfPageNumber: Number(pageNumber),
      book: {
        id: bookId,
        ...(user?.role === UserRole.ADMIN
          ? {}
          : {
              assignedGroupId: {
                in: user?.groupIds,
              },
            }),
      },
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
