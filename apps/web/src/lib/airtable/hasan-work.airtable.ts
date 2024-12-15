import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum HasanWorkTextField {
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

export const fetchHasanWork = async () => {
  return airtable("Hasan Work")
    .select({
      fields: [
        HasanWorkTextField.ID,
        HasanWorkTextField.PDF_URL,
        HasanWorkTextField.DIGITIZED_URL,
        HasanWorkTextField.NAME_ARABIC,
        HasanWorkTextField.OTHER_NAMES,
        HasanWorkTextField.TRANSLITERATION,
        HasanWorkTextField.AUTHOR,
        HasanWorkTextField.NOTES,
        HasanWorkTextField.ADVANCED_GENRES,
        HasanWorkTextField.PHYSICAL_DETAILS,
        HasanWorkTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0)`,
    })
    .all();
};

export const formatHasanWork = (
  texts: Awaited<ReturnType<typeof fetchHasanWork>>,
  authorsById: Record<string, AirtableAuthor>,
  genresById: Record<string, AirtableAdvancedGenre>,
) => {
  return texts
    .map((t) => {
      const fields = t.fields;

      // const transliteratedName =
      //   (fields[AzhariTextField.TRANSLITERATION] as string | undefined) ?? null;
      const transliteratedName = null as string | null;

      const arabicName =
        (fields[HasanWorkTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[HasanWorkTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[HasanWorkTextField.PDF_URL] as string | undefined) ?? null;
      const notes =
        (fields[HasanWorkTextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[HasanWorkTextField.ADVANCED_GENRES] as string[] | undefined) ??
        [];
      const digitizedUrl =
        (fields[HasanWorkTextField.DIGITIZED_URL] as string | undefined) ??
        null;
      const physicalDetails =
        (fields[HasanWorkTextField.PHYSICAL_DETAILS] as string | undefined) ??
        null;

      const authorId =
        (fields[HasanWorkTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[
        HasanWorkTextField.PUBLICATION_DETAILS
      ] as string | undefined;

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
