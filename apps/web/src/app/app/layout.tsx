import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";

import AppContextProvider from "./providers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppContextProvider user={session.user}>{children}</AppContextProvider>
  );
}
