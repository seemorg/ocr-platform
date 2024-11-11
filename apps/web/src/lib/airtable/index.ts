import { revalidateTag, unstable_cache } from "next/cache";

import { getAirtableAdvancedGenres } from "./advanced-genres.airtable";
import { getAirtableAuthors } from "./authors.airtable";
import { fetchHanafiTexts, formatHanafiTexts } from "./hanafi.airtable";
import { fetchMalikiTexts, formatMalikiTexts } from "./maliki.airtable";
import { fetchShafiiTexts, formatShafiiTexts } from "./shafii.airtable";
import { fetchTexts, formatTexts } from "./texts.airtable";

export type AirtableResponse = Awaited<ReturnType<typeof getAirtableTexts>>;
export type AirtableText = AirtableResponse["texts"][number];

export const getAirtableTexts = unstable_cache(
  async () => {
    const [texts, hanafi, maliki, shafii, authorsById, advancedGenresById] =
      await Promise.all([
        fetchTexts(),
        fetchHanafiTexts(),
        fetchMalikiTexts(),
        fetchShafiiTexts(),
        getAirtableAuthors(),
        getAirtableAdvancedGenres(),
      ]);

    return {
      texts: formatTexts(texts, authorsById, advancedGenresById),
      hanafi: formatHanafiTexts(hanafi, authorsById, advancedGenresById),
      maliki: formatMalikiTexts(maliki, authorsById, advancedGenresById),
      shafii: formatShafiiTexts(shafii, authorsById, advancedGenresById),
    };
  },
  ["texts"],
  {
    tags: ["texts"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);

export const invalidateAirtableTexts = () => {
  revalidateTag("texts");
};
