import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { getUserGroupIdsAndRole } from "@/server/services/user";

import { UserRole } from "@usul-ocr/db";

export default async function AppPage() {
  const session = await getServerAuthSession();
  const user = await getUserGroupIdsAndRole(session!.user.id);

  const page = await db.page.findFirst({
    where: {
      reviewed: false,
      ...(user?.role === UserRole.ADMIN
        ? {}
        : {
            Book: {
              Group: {
                id: {
                  in: user?.groupIds,
                },
              },
            },
          }),
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
