import type { AirtableText } from "./texts.airtable";
import { AirtableAdvancedGenre } from "./advanced-genres.airtable";
import { AirtableAuthor } from "./authors.airtable";
import { airtable } from "./base";

enum AzhariTextField {
  ID = "id",
  NAME_ARABIC = "Name (Arabic)",
  AUTHOR = "Author",
  OTHER_NAMES = "Other Names (comma separated)",
  ADVANCED_GENRES = "Advanced Genres",
  PUBLICATION_DETAILS = "Publication Details",
  // TRANSLITERATION = "Transliteration",
  CORE = "Core",
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

export const fetchAzhariTexts = async () => {
  return airtable("al-Manāhij al-Azharīyah")
    .select({
      fields: [
        AzhariTextField.ID,
        AzhariTextField.PDF_URL,
        AzhariTextField.DIGITIZED_URL,
        AzhariTextField.NAME_ARABIC,
        AzhariTextField.OTHER_NAMES,
        // AzhariTextField.TRANSLITERATION,
        AzhariTextField.AUTHOR,
        AzhariTextField.NOTES,
        AzhariTextField.ADVANCED_GENRES,
        AzhariTextField.PHYSICAL_DETAILS,
        AzhariTextField.PUBLICATION_DETAILS,
      ],
      // make sure `Usul` and `Turath.io` are not checked
      filterByFormula: `AND({Usul} = 0, {Turath.io} = 0, {internal tool} = 0)`,
    })
    .all();
};

export const formatAzhariTexts = (
  texts: Awaited<ReturnType<typeof fetchAzhariTexts>>,
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
        (fields[AzhariTextField.NAME_ARABIC] as string | undefined) ?? null;
      const otherNames =
        (fields[AzhariTextField.OTHER_NAMES] as string | undefined) ?? null;
      const pdfUrl =
        (fields[AzhariTextField.PDF_URL] as string | undefined) ?? null;
      const notes =
        (fields[AzhariTextField.NOTES] as string | undefined) ?? null;
      const advancedGenres =
        (fields[AzhariTextField.ADVANCED_GENRES] as string[] | undefined) ?? [];
      const digitizedUrl =
        (fields[AzhariTextField.DIGITIZED_URL] as string | undefined) ?? null;
      const physicalDetails =
        (fields[AzhariTextField.PHYSICAL_DETAILS] as string | undefined) ??
        null;

      const authorId =
        (fields[AzhariTextField.AUTHOR] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      const publicationDetails = fields[AzhariTextField.PUBLICATION_DETAILS] as
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
