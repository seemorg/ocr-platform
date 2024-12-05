import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";

import UsulProviders from "./providers";

export default async function UsulLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <UsulProviders>{children}</UsulProviders>;
}
