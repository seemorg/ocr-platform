"use client";

import { DeleteModal } from "@/components/delete-modal";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";

function CachingPage() {
  return (
    <PageLayout title="Caching" backHref="/admin">
      <div className="flex flex-col gap-20">
        <div>
          <p className="text-2xl font-bold">Cloudflare Cache</p>
          <DeleteModal
            description="This action will remove all cloudflare cache and might cause performance issues."
            action="Invalidate"
            trigger={
              <Button className="mt-3 text-lg" variant="destructive">
                Invalidate Cloudflare Cache
              </Button>
            }
            onDelete={() => {}}
          />
        </div>

        <div>
          <p className="text-2xl font-bold">Typesense</p>
          <DeleteModal
            description="This action will re-index all typesense data."
            action="Re-index"
            trigger={
              <Button className="mt-3 text-lg" variant="destructive">
                Re-index Typesense
              </Button>
            }
            onDelete={() => {}}
          />
        </div>
      </div>
    </PageLayout>
  );
}

export default CachingPage;
