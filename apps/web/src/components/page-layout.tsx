import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "./ui/button";

export default function PageLayout({
  title,
  children,
  backHref,
  actions,
}: {
  title: string | React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container>
        <div className="mb-10 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {backHref && (
              <Button asChild variant="ghost" size="icon">
                <Link href={backHref}>
                  <ArrowLeftIcon className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {title}
          </h1>

          {actions}
        </div>

        {children}
      </Container>
    </main>
  );
}
