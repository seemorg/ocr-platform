import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";

function AdminPage() {
  return (
    <PageLayout title="Admin">
      <div className="grid grid-cols-3 gap-10">
        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/admin/groups">Groups</Link>
        </Button>
      </div>
    </PageLayout>
  );
}

export default AdminPage;
