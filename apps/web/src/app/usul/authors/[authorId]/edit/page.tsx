import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { api } from "@/trpc/server";

import EditTextClientPage from "./client";

export default async function EditAuthorPage({
  params,
}: {
  params: {
    authorId: string;
  };
}) {
  const author = await api.usulAuthor.getById({ id: params.authorId });

  if (!author) {
    notFound();
  }

  return (
    <PageLayout
      title="Edit Author"
      backHref="/usul/authors"
      actions={
        <div className="flex items-center gap-5">
          <a
            href={`https://usul.ai/author/${author.slug}`}
            target="_blank"
            className="text-primary underline"
          >
            View on Usul
          </a>
        </div>
      }
    >
      <EditTextClientPage author={author} />
    </PageLayout>
  );
}
