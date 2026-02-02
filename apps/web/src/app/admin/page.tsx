import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function AdminPage() {
  return (
    <PageLayout title="Admin">
      <div className="grid grid-cols-3 gap-10">
        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/admin/groups">Groups</Link>
        </Button>

        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/admin/caching">Caching</Link>
        </Button>
      </div>
    </PageLayout>
  );
}

export default AdminPage;
