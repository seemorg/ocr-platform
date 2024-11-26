import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { api } from "@/trpc/server";

import AddMemberForm from "./add-form";
import { columns } from "./columns";
import { DataTable } from "./data-table";

async function GroupMembersPage({
  params: { groupId },
}: {
  params: { groupId: string };
}) {
  const data = await api.group.getWithMembers({
    groupId: groupId,
  });

  if (!data) {
    notFound();
  }

  return (
    <PageLayout title={`"${data.name}" Members`} backHref="/admin/groups">
      <AddMemberForm groupId={groupId} />
      <DataTable
        columns={columns}
        data={data.groupMemberships.map((g) => ({ ...g, groupId }))}
      />
    </PageLayout>
  );
}

export default GroupMembersPage;
