import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { api } from "@/trpc/server";

import EditTextClientPage from "./client";

export default async function EditGenrePage({
  params,
}: {
  params: {
    textId: string;
  };
}) {
  const text = await api.usulBook.getById({ id: params.textId });

  if (!text) {
    notFound();
  }

  return (
    <PageLayout title="Edit Text" backHref="/usul/texts">
      <EditTextClientPage text={text} />
    </PageLayout>
  );
}
