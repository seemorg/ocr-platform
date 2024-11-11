import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum MalikiTextField {
  ID = "id",
  NAME_ARABIC = "Name (Arabic)",
  AUTHOR = "Author",
  PUBLICATION_DETAILS = "Publication Details",
  OTHER_NAMES = "Other Names (comma separated)",
  GENRES = "Genres",
  TRANSLITERATION = "Transliteration",
  CORE = "In Core Corpus?",
  USUL = "Usul",
  USUL_URL = "Usul URL",
  TURATH = "Turath.io",
  TURATH_ID = "Turath.io ID",
  DIGITIZED_URL = "Digitized Text URL",
  PDF_URL = "Scanned PDF URL",
  PHYSICAL_ONLY = "Physical Only",
  PHYSICAL_DETAILS = "Physical Details",
  NEEDS_REVIEW = "Needs Review",
  NOTES = "Notes",
}

export const fetchMalikiTexts = async () => {
  return airtable("Maliki Texts")
    .select({
      fields: [
        MalikiTextField.ID,
        MalikiTextField.PDF_URL,
        MalikiTextField.DIGITIZED_URL,
        MalikiTextField.NAME_ARABIC,
        MalikiTextField.OTHER_NAMES,
        MalikiTextField.TRANSLITERATION,
        MalikiTextField.AUTHOR,
        MalikiTextField.NOTES,
        MalikiTextField.PHYSICAL_DETAILS,
        MalikiTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatMalikiTexts = (
  texts: Awaited<ReturnType<typeof fetchMalikiTexts>>,
  authorsById: Record<string, AirtableAuthor>,
  genresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[MalikiTextField.TRANSLITERATION] as string | undefined) ?? null;
      const arabicName =
        (fields[MalikiTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[MalikiTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[MalikiTextField.PDF_URL] as string | undefined) ?? null;
      const notes =
        (fields[MalikiTextField.NOTES] as string | undefined) ?? null;
      // const advancedGenres =
      //   (fields[MalikiTextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      // const advancedGenres = [];
      const digitizedUrl =
        (fields[MalikiTextField.DIGITIZED_URL] as string | undefined) ?? null;
      const physicalDetails =
        (fields[MalikiTextField.PHYSICAL_DETAILS] as string | undefined) ??
        null;

      const authorId =
        (fields[MalikiTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[MalikiTextField.PUBLICATION_DETAILS] as
        | string
        | undefined;

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
        // advancedGenres: advancedGenres.map((g) => genresById[g]),
        advancedGenres: [],
        otherNames: otherNames ? otherNames.split(",") : [],
        publicationDetails,
      } as AirtableText;
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
};
