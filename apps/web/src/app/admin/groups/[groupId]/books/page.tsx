import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { api } from "@/trpc/server";

import AddBookForm from "./add-form";
import { columns } from "./columns";
import { DataTable } from "./data-table";

async function GroupBooksPage({
  params: { groupId },
}: {
  params: { groupId: string };
}) {
  const data = await api.group.getWithBooks({
    groupId: groupId,
  });

  if (!data) {
    notFound();
  }

  return (
    <PageLayout title={`"${data.name}" Books`}>
      <AddBookForm groupId={groupId} />
      <DataTable columns={columns} data={data.assignedBooks} />
    </PageLayout>
  );
}

export default GroupBooksPage;
