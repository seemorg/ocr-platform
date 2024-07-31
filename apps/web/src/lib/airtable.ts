import { unstable_cache } from "next/cache";
import { env } from "@/env";
import Airtable from "airtable";

const airtable = new Airtable({
  apiKey: env.AIRTABLE_API_TOKEN,
}).base(env.AIRTABLE_APP_ID);

export type AirtableText = {
  _airtableReference: string;
  id: string;
  pdfUrl: string | null;
  arabicName: string | null;
  transliteration: string;
  author: {
    airtableId: string;
    arabicName: string;
    isOpenITIAuthor: boolean;
  } | null;
};

export const getAirtableTexts = unstable_cache(
  async () => {
    const [texts, authors] = await Promise.all([
      airtable("Texts")
        .select({
          fields: [
            "id",
            "Scanned PDF URL",
            "id (from OpenITI ID)",
            "Transliteration",
            "Author",
          ],
          // make sure `Usul` is not checked AND `Core` is checked
          filterByFormula: `AND(
            {Usul} = 0,
            {Core} = 1
          )`,
        })
        .all(),
      airtable("Authors")
        .select({
          fields: ["id", "Name (Arabic)", "Name (English)"],
        })
        .all(),
    ]);

    const authorsById = authors.reduce(
      (acc, author) => {
        const fields = author.fields;
        const isOpenITIAuthor = !!fields["id"] && !!fields["Name (English)"];

        return {
          ...acc,
          [author.id]: {
            airtableId: author.id as string,
            arabicName: fields["Name (Arabic)"] as string,
            isOpenITIAuthor,
          },
        };
      },
      {} as Record<
        string,
        { airtableId: string; arabicName: string; isOpenITIAuthor: boolean }
      >,
    );

    return texts.map((t) => {
      const fields = t.fields;
      const authorId = (fields["Author"] as string[])?.[0] ?? null;
      const author = authorId ? authorsById[authorId] : null;

      return {
        _airtableReference: t.id,
        id: fields.id,
        pdfUrl: fields["Scanned PDF URL"] ?? null,
        arabicName: (fields["id (from OpenITI ID)"] as string[])?.[0] ?? null,
        transliteration: fields["Transliteration"],
        author,
      } as AirtableText;
    });
  },
  ["texts"],
  {
    tags: ["texts"],
    revalidate: 60 * 60 * 24, // 1 day
  },
);
