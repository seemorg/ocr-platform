import PageLayout from "@/components/page-layout";
import { db } from "@/server/db";

import AddWhitelistForm from "./add-form";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function WhitelistPage() {
  const data = await db.userWhitelist.findMany();

  return (
    <PageLayout title="Whitelist">
      <AddWhitelistForm />
      <DataTable columns={columns} data={data} />
    </PageLayout>
  );
}
