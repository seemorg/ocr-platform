"use client";

import { Toaster as UiToaster } from "@/components/ui/toaster";
import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <UiToaster />
      <NextTopLoader />

      <TRPCReactProvider>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
          {children}
        </SessionProvider>
      </TRPCReactProvider>
    </>
  );
}
