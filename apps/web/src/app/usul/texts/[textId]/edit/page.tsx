import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { api } from "@/trpc/server";

import DeleteBookButton from "../../delete-book-button";
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
    <PageLayout
      title="Edit Text"
      backHref="/usul/texts"
      actions={
        <div className="flex items-center gap-5">
          <a
            href={`https://usul.ai/t/${text.slug}`}
            target="_blank"
            className="text-primary underline"
          >
            View on Usul
          </a>

          <DeleteBookButton textId={text.id} />
        </div>
      }
    >
      <EditTextClientPage text={text} />
    </PageLayout>
  );
}
