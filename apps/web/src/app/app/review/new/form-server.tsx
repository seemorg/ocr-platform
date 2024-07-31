import { getAirtableTexts } from "@/lib/airtable";

import NewBookForm from "./form";

export default async function NewBookServerForm() {
  const airtableTexts = (await getAirtableTexts()).sort((a, b) => {
    return Number(a.id) - Number(b.id);
  });

  return <NewBookForm airtableTexts={airtableTexts} />;
}
