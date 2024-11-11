import { airtable } from "./base";

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

export type AirtableAuthor = {
  _airtableReference: string;
  arabicName: string | null;
  transliteration: string | null;
  isUsul: boolean;
  usulUrl: string | null;
  diedYear: number | null;
};

export const getAirtableAuthors = async () => {
  const authors = await airtable("Authors")
    .select({
      fields: [
        AuthorField.NAME_ARABIC,
        AuthorField.TRANSLITERATION,
        AuthorField.USUL,
        AuthorField.USUL_URL,
        AuthorField.DIED_YEAR,
      ],
    })
    .all();

  return authors.reduce(
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
    {} as Record<string, AirtableAuthor>,
  );
};
