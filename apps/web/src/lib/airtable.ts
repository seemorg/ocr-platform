import { revalidateTag, unstable_cache } from "next/cache";
import { env } from "@/env";
import Airtable from "airtable";

const airtable = new Airtable({
  apiKey: env.AIRTABLE_API_TOKEN,
}).base(env.AIRTABLE_APP_ID);

enum TextField {
  ID = "id",
  AUTHOR = "Author",
  GENRES = "Genres",
  ADVANCED_GENRES = "Advanced Genres",
  NAME_ARABIC = "Name (Arabic)",
  OTHER_NAMES = "Other Names (comma separated)",
  TRANSLITERATION = "Transliteration",
  PDF_URL = "Scanned PDF URL",
  CORE = "Core",
  USUL = "Usul",
  USUL_URL = "Usul URL",
  TURATH = "Turath",
  TURATH_ID = "Turath ID",
  DIGITIZED_URL = "Digitized Text URL",
  PHYSICAL_ONLY = "Physical Only",
  PHYSICAL_DETAILS = "Physical Details",
  NOTES = "Notes",
  NEEDS_REVIEW = "Needs Review",
}

enum AuthorField {
  NAME_ARABIC = "Name (Arabic)",
  TRANSLITERATION = "Transliteration",
  OTHER_NAMES = "Other Names (comma separated)",
  BORN_YEAR = "Born Year (AH)",
  DIED_YEAR = "Died Year (AH)",
  BIO_ENGLISH = "Bio (English)",
  USUL = "Usul",
  USUL_URL = "Usul URL",
  TEXTS = "Texts",
}

enum AdvancedGenreField {
  NAME_ARABIC = "Name",
}

export type AirtableText = {
  _airtableReference: string;
  id: string;
  pdfUrl: string | null;
  digitizedUrl: string | null;
  arabicName: string | null;
  transliteration: string;
  notes: string | null;
  advancedGenres: {
    _airtableReference: string;
    name: string;
  }[];
  otherNames: string[];
  author: {
    _airtableReference: string;
    arabicName: string | null;
    transliteration: string | null;
    isUsul: boolean;
    usulUrl: string | null;
    diedYear: number | null;
  } | null;
};

export const getAirtableTexts = unstable_cache(
  async () => {
    const [texts, authors, advancedGenres] = await Promise.all([
      airtable("Texts")
        .select({
          fields: [
            TextField.ID,
            TextField.PDF_URL,
            TextField.DIGITIZED_URL,
            TextField.NAME_ARABIC,
            TextField.OTHER_NAMES,
            TextField.TRANSLITERATION,
            TextField.AUTHOR,
            TextField.NOTES,
            TextField.ADVANCED_GENRES,
          ],
          // make sure `Usul` is not checked
          filterByFormula: `{Usul} = 0`,
        })
        .all(),
      airtable("Authors")
        .select({
          fields: [
            AuthorField.NAME_ARABIC,
            AuthorField.TRANSLITERATION,
            AuthorField.USUL,
            AuthorField.USUL_URL,
            AuthorField.DIED_YEAR,
          ],
        })
        .all(),
      airtable("Advanced Genres [DO NOT EDIT]")
        .select({
          fields: [AdvancedGenreField.NAME_ARABIC],
        })
        .all(),
    ]);

    const authorsById = authors.reduce(
      (acc, author) => {
        const fields = author.fields;
        const arabicName =
          (fields[AuthorField.NAME_ARABIC] as string | undefined) ?? null;
        const transliteratedName =
          (fields[AuthorField.TRANSLITERATION] as string | undefined) ?? null;
        const isUsul = !!fields[AuthorField.USUL];
        const usulUrl =
          (fields[AuthorField.USUL_URL] as string | undefined) ?? null;
        const diedYear =
          (fields[AuthorField.DIED_YEAR] as string | undefined) ?? null;

        return {
          ...acc,
          [author.id]: {
            _airtableReference: author.id as string,
            arabicName: arabicName,
            transliteration: transliteratedName?.startsWith("*")
              ? transliteratedName.slice(1)
              : transliteratedName,
            isUsul,
            usulUrl,
            diedYear: diedYear ? parseInt(diedYear) : null,
          },
        };
      },
      {} as Record<string, NonNullable<AirtableText["author"]>>,
    );

    const advancedGenresById = advancedGenres.reduce(
      (acc, genre) => {
        const fields = genre.fields;
        const arabicName =
          (fields[AdvancedGenreField.NAME_ARABIC] as string | undefined) ??
          null;

        return {
          ...acc,
          [genre.id]: {
            _airtableReference: genre.id as string,
            name: arabicName!,
          },
        };
      },
      {} as Record<string, NonNullable<AirtableText["advancedGenres"]>[number]>,
    );

    return texts.map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[TextField.TRANSLITERATION] as string | undefined) ?? null;
      const arabicName =
        (fields[TextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[TextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl = (fields[TextField.PDF_URL] as string | undefined) ?? null;
      const notes = (fields[TextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[TextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      const digitizedUrl =
        (fields[TextField.DIGITIZED_URL] as string | undefined) ?? null;

      const authorId = (fields[TextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      return {
        _airtableReference: t.id,
        id: fields.id as string,
        pdfUrl,
        digitizedUrl,
        arabicName,
        transliteration: transliteratedName?.startsWith("*")
          ? transliteratedName.slice(1)
          : transliteratedName,
        author,
        notes,
        advancedGenres: advancedGenres.map((g) => advancedGenresById[g]),
        otherNames: otherNames ? otherNames.split(",") : [],
      } as AirtableText;
    });
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
