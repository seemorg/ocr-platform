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
    <PageLayout title="Edit Author" backHref="/usul/authors">
      <EditTextClientPage author={author} />
    </PageLayout>
  );
}
