"use client";

import type { Session } from "next-auth";
import React, { createContext, useContext } from "react";

const AppContext = createContext<{ user: NonNullable<Session["user"]> }>(
  {} as any,
);

export const useAppContext = () => useContext(AppContext);

export default function AppContextProvider({
  children,
  user,
}: {
  user: NonNullable<Session["user"]>;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={{ user }}>{children}</AppContext.Provider>;
}
