import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  direction: "ltr" | "rtl";
  setDirection: (direction: "ltr" | "rtl") => void;
}

export const useSettingsStore = create(
  persist<SettingsStore>(
    (set) => ({
      direction: "rtl",
      setDirection: (direction) => set({ direction }),
    }),
    {
      name: "settings",
    },
  ),
);
