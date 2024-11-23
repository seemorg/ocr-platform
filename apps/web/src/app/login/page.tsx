import { redirect } from "next/navigation";
import { Logo } from "@/components/icons";
import { getServerAuthSession } from "@/server/auth";

import AuthForm from "./auth-form";

export default async function LoginPage() {
  const session = await getServerAuthSession();

  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="container relative grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-primary" />
        <Logo className="z-[1] h-auto w-20" aria-label="Usul" />
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          </div>
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
