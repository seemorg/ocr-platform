import { airtable } from "./base";

enum AdvancedGenreField {
  NAME_ARABIC = "Name",
}

export type AirtableAdvancedGenre = {
  _airtableReference: string;
  name: string;
};

export const getAirtableAdvancedGenres = async () => {
  const advancedGenres = await airtable("Advanced Genres [DO NOT EDIT]")
    .select({
      fields: [AdvancedGenreField.NAME_ARABIC],
    })
    .all();

  return advancedGenres.reduce(
    (acc, genre) => {
      const fields = genre.fields;
      const arabicName =
        (fields[AdvancedGenreField.NAME_ARABIC] as string | undefined) ?? null;

      return {
        ...acc,
        [genre.id]: {
          _airtableReference: genre.id as string,
          name: arabicName!,
        },
      };
    },
    {} as Record<string, AirtableAdvancedGenre>,
  );
};
