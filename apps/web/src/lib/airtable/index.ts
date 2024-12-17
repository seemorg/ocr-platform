import { revalidateTag, unstable_cache } from "next/cache";

import { getAirtableAdvancedGenres } from "./advanced-genres.airtable";
import { getAirtableAuthors } from "./authors.airtable";
import { fetchAzhariTexts, formatAzhariTexts } from "./azhari.airtable";
import { fetchHanafiTexts, formatHanafiTexts } from "./hanafi.airtable";
import { fetchHasanWork, formatHasanWork } from "./hasan-work.airtable";
import { fetchIraqTexts, formatIraqTexts } from "./iraq.airtable";
import { fetchIsmailTexts, formatIsmailTexts } from "./ismail-texts.airtable";
import { fetchMalikiTexts, formatMalikiTexts } from "./maliki.airtable";
import { fetchShafiiTexts, formatShafiiTexts } from "./shafii.airtable";
import { fetchTexts, formatTexts } from "./texts.airtable";

export type AirtableResponse = Awaited<
  ReturnType<typeof getAirtableGeneralTexts>
>;
export type AirtableText = AirtableResponse[number];

const cachedAuthorsAndAdvancedGenres = unstable_cache(
  async () => {
    const [authors, advancedGenres] = await Promise.all([
      getAirtableAuthors(),
      getAirtableAdvancedGenres(),
    ]);
    return { authors, advancedGenres };
  },
  ["authors-and-advanced-genres"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableGeneralTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, texts] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchTexts(),
    ]);
    return formatTexts(texts, authors, advancedGenres);
  },
  ["general-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableHanafiTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, hanafi] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchHanafiTexts(),
    ]);
    return formatHanafiTexts(hanafi, authors, advancedGenres);
  },
  ["hanafi-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableMalikiTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, maliki] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchMalikiTexts(),
    ]);
    return formatMalikiTexts(maliki, authors, advancedGenres);
  },
  ["maliki-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableShafiiTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, shafii] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchShafiiTexts(),
    ]);
    return formatShafiiTexts(shafii, authors, advancedGenres);
  },
  ["shafii-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableIraqTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, iraq] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchIraqTexts(),
    ]);
    return formatIraqTexts(iraq, authors, advancedGenres);
  },
  ["iraq-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableAzhariTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, azhari] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchAzhariTexts(),
    ]);
    return formatAzhariTexts(azhari, authors, advancedGenres);
  },
  ["azhari-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableHasanWork = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, hasanWork] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchHasanWork(),
    ]);
    return formatHasanWork(hasanWork, authors, advancedGenres);
  },
  ["hasan-work"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const getAirtableIsmailTexts = unstable_cache(
  async () => {
    const [{ authors, advancedGenres }, ismail] = await Promise.all([
      cachedAuthorsAndAdvancedGenres(),
      fetchIsmailTexts(),
    ]);
    return formatIsmailTexts(ismail, authors, advancedGenres);
  },
  ["ismail-texts"],
  {
    tags: ["airtable-data"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const invalidateAirtableTexts = () => {
  revalidateTag("airtable-data");
};
