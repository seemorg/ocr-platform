import PageLayout from "@/components/page-layout";
import { db } from "@/server/db";

import AddGroupForm from "./add-form";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export const dynamic = "force-dynamic";

async function GroupsPage() {
  const data = await db.group.findMany();

  return (
    <PageLayout title="Groups" backHref="/admin">
      <AddGroupForm />
      <DataTable columns={columns} data={data} />
    </PageLayout>
  );
}

export default GroupsPage;
