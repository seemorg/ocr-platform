import { z } from "zod";

export const zEmptyStrToUndefined = z.preprocess((arg) => {
  if (typeof arg === "string" && arg === "") {
    return undefined;
  } else {
    return arg;
  }
}, z.string().optional());

export const zEmptyUrlToUndefined = z.preprocess((arg) => {
  if (typeof arg === "string" && arg === "") {
    return undefined;
  } else {
    return arg;
  }
}, z.string().url().optional());

export const publicationDetailsSchema = {
  investigator: z.string().optional(),
  publisher: z.string().optional(),
  publisherLocation: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.string().optional(),
};
