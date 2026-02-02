import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

import NewBookForm from "./form";

export const dynamic = "force-dynamic";

export default function NewBookPage() {
  return (
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">New Book</h1>
          <Link href="/app/review">
            <Button>Back</Button>
          </Link>
        </div>

        <NewBookForm />
      </Container>
    </main>
  );
}
