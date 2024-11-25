import { z } from "zod";

import { openai } from ".";

const SYSTEM_PROMPT = `
You are an assistant that helps Islamic researchers. You take a concatenated string of a book's publishing details in arabic as input, and return a JSON with the publishing details detected in the input.
  
The schema should match the following: 
{
  "investigator": String | null,
  "publisher": String | null,
  "publisherLocation": String | null,
  "editionNumber": String | null,
  "publicationYear": Number | null
}

المحقق = investigator
دار النشر = publisher
مكان نشر الكتاب = publisherLocation
رقم الطبعة = editionNumber
سنة النشر = publicationYear

--------------------------------

Example input: "المحقق: الدكتور عزالدين الغرياني وابنه محمد عزالدين الغرياني / دار النشر: مكتبة طرابلس العلمية العالمية / رقم الطبعة : الأولى / سنة النشر: 1420هـ"
Example output: {
"investigator": "الدكتور عزالدين الغرياني وابنه محمد عزالدين الغرياني", 
"publisher": "مكتبة طرابلس العلمية العالمية", 
"publisherLocation": "طرابلس", 
"editionNumber": "الأولى", 
"publicationYear": 1420
}

Example input: "المحقق: / دار النشر: دار ابن حزم / رقم الطبعة : الأولى / سنة النشر: 1467هـ"
Example output: {
  "investigator": null,
  "publisher": "دار ابن حزم",
  "publisherLocation": null,
  "editionNumber": "الأولى",
  "publicationYear": 1467
}

Example input: "المحقق: / دار النشر:  / رقم الطبعة :  / سنة النشر: "
Example output: {
  "investigator": null,
  "publisher": null,
  "publisherLocation": null,
  "editionNumber": null,
  "publicationYear": null
}
`.trim();

const schema = z.object({
  investigator: z.string().nullable(),
  publisher: z.string().nullable(),
  publisherLocation: z.string().nullable(),
  editionNumber: z.string().nullable(),
  publicationYear: z.number().nullable(),
});

export const extractPublishingDetails = async (text: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `"${text}"` },
      ],
    });

    const result = completion.choices[0]?.message.content;
    console.log(result);

    if (!result) return null;

    const parsedResult = schema.safeParse(JSON.parse(result));
    if (!parsedResult.success) return null;

    return parsedResult.data;
  } catch (e: any) {
    return null;
  }
};
