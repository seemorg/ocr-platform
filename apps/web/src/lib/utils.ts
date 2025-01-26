import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { nanoid } from "nanoid";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let formatter: Intl.NumberFormat;
export const formatNumber = (num: number) => {
  if (!formatter) formatter = new Intl.NumberFormat("en-US");
  return formatter.format(num);
};

export const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const createVersionId = () => nanoid(10);
