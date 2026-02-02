"use client";

import { Toaster as UiToaster } from "@/components/ui/toaster";
import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";

// Dynamically import NextTopLoader to avoid issues during static generation
const NextTopLoader = dynamic(
  () => import("nextjs-toploader") as Promise<{ default: React.ComponentType }>,
  { ssr: false }
);

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
