import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

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
  TURATH = "Turath.io",
  TURATH_ID = "Turath.io ID",
  DIGITIZED_URL = "Digitized Text URL",
  PHYSICAL_ONLY = "Physical Only",
  PHYSICAL_DETAILS = "Physical Details",
  NOTES = "Notes",
  NEEDS_REVIEW = "Needs Review",
}

export type AirtableText = {
  _airtableReference: string;
  id: string;
  pdfUrl: string | null;
  digitizedUrl: string | null;
  arabicName: string | null;
  transliteration: string;
  notes: string | null;
  physicalDetails: string | null;
  advancedGenres: AirtableAdvancedGenre[];
  otherNames: string[];
  author: AirtableAuthor | null;
  publicationDetails: string | null;
};

export const fetchTexts = async () => {
  return airtable("Texts")
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
        TextField.PHYSICAL_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatTexts = (
  texts: Awaited<ReturnType<typeof fetchTexts>>,
  authorsById: Record<string, AirtableAuthor>,
  advancedGenresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
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
      const physicalDetails =
        (fields[TextField.PHYSICAL_DETAILS] as string | undefined) ?? null;

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
        physicalDetails,
        advancedGenres: advancedGenres.map((g) => advancedGenresById[g]),
        otherNames: otherNames ? otherNames.split(",") : [],
        publicationDetails: null,
      } as AirtableText;
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
};
