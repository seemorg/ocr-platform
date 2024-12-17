import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum IsmailTextField {
  ID = "id",
  NAME_ARABIC = "Name (Arabic)",
  AUTHOR = "Author",
  ADVANCED_GENRES = "Advanced Genres",
  PUBLICATION_DETAILS = "Publication Details",
  OTHER_NAMES = "Other Names (comma separated)",
  TRANSLITERATION = "Transliteration",
  CORE = "In Core Corpus?",
  CORE_CORPUS_ID = "Core Corpus Id",
  PDF_URL = "Scanned PDF URL",
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

export const fetchIsmailTexts = async () => {
  return airtable("Ismail Texts")
    .select({
      fields: [
        IsmailTextField.ID,
        IsmailTextField.PDF_URL,
        IsmailTextField.DIGITIZED_URL,
        IsmailTextField.NAME_ARABIC,
        IsmailTextField.OTHER_NAMES,
        IsmailTextField.TRANSLITERATION,
        IsmailTextField.AUTHOR,
        IsmailTextField.NOTES,
        IsmailTextField.ADVANCED_GENRES,
        IsmailTextField.PHYSICAL_DETAILS,
        IsmailTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatIsmailTexts = (
  texts: Awaited<ReturnType<typeof fetchIsmailTexts>>,
  authorsById: Record<string, AirtableAuthor>,
  genresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[IsmailTextField.TRANSLITERATION] as string | undefined) ?? null;

      const arabicName =
        (fields[IsmailTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[IsmailTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[IsmailTextField.PDF_URL] as string | undefined) ?? null;
      const notes =
        (fields[IsmailTextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[IsmailTextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      const digitizedUrl =
        (fields[IsmailTextField.DIGITIZED_URL] as string | undefined) ?? null;
      const physicalDetails =
        (fields[IsmailTextField.PHYSICAL_DETAILS] as string | undefined) ??
        null;

      const authorId =
        (fields[IsmailTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[IsmailTextField.PUBLICATION_DETAILS] as
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
