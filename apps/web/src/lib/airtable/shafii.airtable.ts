import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum ShafiiTextField {
  ID = "id",
  AUTHOR = "Author",
  ADVANCED_GENRES = "Advanced Genres",
  NAME_ARABIC = "Name (Arabic)",
  OTHER_NAMES = "Other Names (comma separated)",
  TRANSLITERATION = "Transliteration",
  PUBLICATION_DETAILS = "Publication Details",
  PDF_URL = "Scanned PDF URL",
  CORE = "In Core Corpus?",
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

export const fetchShafiiTexts = async () => {
  return airtable("Shafii Texts")
    .select({
      fields: [
        ShafiiTextField.ID,
        ShafiiTextField.PDF_URL,
        ShafiiTextField.DIGITIZED_URL,
        ShafiiTextField.NAME_ARABIC,
        ShafiiTextField.OTHER_NAMES,
        ShafiiTextField.TRANSLITERATION,
        ShafiiTextField.AUTHOR,
        ShafiiTextField.NOTES,
        ShafiiTextField.ADVANCED_GENRES,
        ShafiiTextField.PHYSICAL_DETAILS,
        ShafiiTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatShafiiTexts = (
  texts: Awaited<ReturnType<typeof fetchShafiiTexts>>,
  authorsById: Record<string, AirtableAuthor>,
  genresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[ShafiiTextField.TRANSLITERATION] as string | undefined) ?? null;
      const arabicName =
        (fields[ShafiiTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[ShafiiTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[ShafiiTextField.PDF_URL] as string | undefined) ?? null;
      const notes =
        (fields[ShafiiTextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[ShafiiTextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      const digitizedUrl =
        (fields[ShafiiTextField.DIGITIZED_URL] as string | undefined) ?? null;
      const physicalDetails =
        (fields[ShafiiTextField.PHYSICAL_DETAILS] as string | undefined) ??
        null;

      const authorId =
        (fields[ShafiiTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[ShafiiTextField.PUBLICATION_DETAILS] as
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
        advancedGenres: advancedGenres.map((g) => genresById[g]),
        otherNames: otherNames ? otherNames.split(",") : [],
        publicationDetails,
      } as AirtableText;
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
};
