import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";

import { UserRole } from "@usul-ocr/db";

export async function withAdminAuth(Component: React.ComponentType<any>) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (user?.role !== UserRole.ADMIN) {
    redirect("/app");
  }

  return Component;
}
