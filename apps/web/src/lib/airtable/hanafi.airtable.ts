import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum HanafiTextField {
  ID = "id",
  NAME_ARABIC = "Name (Arabic)",
  AUTHOR = "Author",
  PUBLICATION_DETAILS = "Publication Details",
  OTHER_NAMES = "Other Names (comma separated)",
  ADVANCED_GENRES = "Advanced Genres",
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

export const fetchHanafiTexts = async () => {
  return airtable("Hanafi Texts")
    .select({
      fields: [
        HanafiTextField.ID,
        HanafiTextField.PDF_URL,
        HanafiTextField.DIGITIZED_URL,
        HanafiTextField.NAME_ARABIC,
        HanafiTextField.OTHER_NAMES,
        HanafiTextField.TRANSLITERATION,
        HanafiTextField.AUTHOR,
        HanafiTextField.NOTES,
        HanafiTextField.PHYSICAL_DETAILS,
        HanafiTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatHanafiTexts = (
  texts: Awaited<ReturnType<typeof fetchHanafiTexts>>,
  authorsById: Record<string, AirtableAuthor>,
  genresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[HanafiTextField.TRANSLITERATION] as string | undefined) ?? null;
      const arabicName =
        (fields[HanafiTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[HanafiTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[HanafiTextField.PDF_URL] as string | undefined) ?? null;
      const notes =
        (fields[HanafiTextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[HanafiTextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      const digitizedUrl =
        (fields[HanafiTextField.DIGITIZED_URL] as string | undefined) ?? null;
      const physicalDetails =
        (fields[HanafiTextField.PHYSICAL_DETAILS] as string | undefined) ??
        null;

      const authorId =
        (fields[HanafiTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[HanafiTextField.PUBLICATION_DETAILS] as
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
