import { getAirtableTexts } from "@/lib/airtable";

import NewBookForm from "./form";

export default async function NewBookServerForm() {
  const airtableTexts = await getAirtableTexts();
  return <NewBookForm airtableTexts={airtableTexts.texts} />;
}
