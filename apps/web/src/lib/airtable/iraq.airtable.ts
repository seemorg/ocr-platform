import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum IraqTextField {
  ID = "id",
  NAME_ARABIC = "Name (Arabic)",
  AUTHOR = "Author",
  OTHER_NAMES = "Other Names (comma separated)",
  PUBLICATION_DETAILS = "Publication Details",
  ADVANCED_GENRES = "Advanced Genres",
  TRANSLITERATION = "Transliteration",
  CORE = "In Core Corpus?",
  CORE_CORPUS_ID = "Core Corpus Id",
  USUL = "Usul",
  USUL_URL = "Usul URL",
  TURATH = "Turath.io",
  TURATH_ID = "Turath.io ID",
  DIGITIZED_URL = "Digitized Text URL",
  PDF_URL = "Scanned PDF URL",
  PHYSICAL_ONLY = "Physical Only",
  PHYSICAL_DETAILS = "Physical Details",
  NOTES = "Notes",
  NEEDS_REVIEW = "Needs Review",
}

export const fetchIraqTexts = async () => {
  return airtable("Iraq Publications")
    .select({
      fields: [
        IraqTextField.ID,
        IraqTextField.PDF_URL,
        IraqTextField.DIGITIZED_URL,
        IraqTextField.NAME_ARABIC,
        IraqTextField.OTHER_NAMES,
        IraqTextField.TRANSLITERATION,
        IraqTextField.AUTHOR,
        IraqTextField.NOTES,
        IraqTextField.ADVANCED_GENRES,
        IraqTextField.PHYSICAL_DETAILS,
        IraqTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatIraqTexts = (
  texts: Awaited<ReturnType<typeof fetchIraqTexts>>,
  authorsById: Record<string, AirtableAuthor>,
  genresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
      const fields = t.fields;

      const transliteratedName =
        (fields[IraqTextField.TRANSLITERATION] as string | undefined) ?? null;
      const arabicName =
        (fields[IraqTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[IraqTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[IraqTextField.PDF_URL] as string | undefined) ?? null;
      const notes = (fields[IraqTextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[IraqTextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      const digitizedUrl =
        (fields[IraqTextField.DIGITIZED_URL] as string | undefined) ?? null;
      const physicalDetails =
        (fields[IraqTextField.PHYSICAL_DETAILS] as string | undefined) ?? null;

      const authorId = (fields[IraqTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[IraqTextField.PUBLICATION_DETAILS] as
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
