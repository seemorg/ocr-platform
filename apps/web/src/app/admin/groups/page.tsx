import PageLayout from "@/components/page-layout";
import { db } from "@/server/db";

import { withAdminAuth } from "../admin-page";
import AddGroupForm from "./add-form";
import { columns } from "./columns";
import { DataTable } from "./data-table";

async function GroupsPage() {
  const data = await db.group.findMany();

  return (
    <PageLayout title="Groups">
      <AddGroupForm />
      <DataTable columns={columns} data={data} />
    </PageLayout>
  );
}

export default withAdminAuth(GroupsPage);
