import Link from "next/link";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";

export default function UsulPage() {
  return (
    <PageLayout title="Usul Admin Panel">
      <div className="grid grid-cols-3 gap-10">
        {/* <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/genres">Genres</Link>
        </Button> */}

        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/texts">Texts</Link>
        </Button>

        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/authors">Authors</Link>
        </Button>

        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/advanced-genres">Genres</Link>
        </Button>

        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/regions">Regions</Link>
        </Button>

        <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/empires">Empires & Eras</Link>
        </Button>

        {/* <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/regions">Regions</Link>
        </Button> */}

        {/* <Button asChild className="min-h-[150px] text-lg" variant="outline">
          <Link href="/usul/locations">Locations</Link>
        </Button> */}
      </div>

      <div className="mt-20">
        <h2>Workflows</h2>
        <div className="mt-5 grid grid-cols-3 gap-10">
          <Button asChild className="min-h-[150px] text-lg" variant="outline">
            <Link href="/usul/airtable-workflow">
              Import book from Airtable
            </Link>
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
