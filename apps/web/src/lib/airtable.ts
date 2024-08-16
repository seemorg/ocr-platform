import { unstable_cache } from "next/cache";
import { env } from "@/env";
import Airtable from "airtable";

const airtable = new Airtable({
  apiKey: env.AIRTABLE_API_TOKEN,
}).base(env.AIRTABLE_APP_ID);

enum TextField {
  ID = "id",
  AUTHOR = "Author",
  GENRES = "Genres",
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
  ID = "id",
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

export type AirtableText = {
  _airtableReference: string;
  id: string;
  pdfUrl: string | null;
  arabicName: string | null;
  transliteration: string;
  author: {
    _airtableReference: string;
    arabicName: string | null;
    transliteration: string | null;
    isUsul: boolean;
  } | null;
};

export const getAirtableTexts = unstable_cache(
  async () => {
    const [texts, authors] = await Promise.all([
      airtable("Texts")
        .select({
          fields: [
            TextField.ID,
            TextField.PDF_URL,
            TextField.NAME_ARABIC,
            TextField.TRANSLITERATION,
            TextField.AUTHOR,
          ],
          // make sure `Usul` is not checked AND `Core` is checked
          filterByFormula: `AND(
            {Usul} = 0,
            {Core} = 1
          )`,
        })
        .all(),
      airtable("Authors")
        .select({
          fields: [
            AuthorField.ID,
            AuthorField.NAME_ARABIC,
            AuthorField.TRANSLITERATION,
            AuthorField.USUL,
          ],
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

        return {
          ...acc,
          [author.id]: {
            _airtableReference: author.id as string,
            arabicName: arabicName,
            transliteration: transliteratedName,
            isUsul,
          },
        };
      },
      {} as Record<string, NonNullable<AirtableText["author"]>>,
    );

    return texts.map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[TextField.TRANSLITERATION] as string | undefined) ?? null;
      const arabicName =
        (fields[TextField.NAME_ARABIC] as string | undefined) ?? null;
      const pdfUrl = (fields[TextField.PDF_URL] as string | undefined) ?? null;

      const authorId = (fields[TextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      return {
        _airtableReference: t.id,
        id: fields.id as string,
        pdfUrl,
        arabicName,
        transliteration: transliteratedName,
        author,
      } as AirtableText;
    });
  },
  ["texts"],
  {
    tags: ["texts"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);
