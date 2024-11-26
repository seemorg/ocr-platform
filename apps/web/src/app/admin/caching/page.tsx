"use client";

import { useEffect, useState } from "react";
import { DeleteModal } from "@/components/delete-modal";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function CachingPage() {
  const [typesenseStartTime, setTypesenseStartTime] = useState<number | null>(
    null,
  );
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);

  const { data: typesenseStatus } = api.cache.getTypesenseStatus.useQuery(
    undefined,
    {
      refetchInterval: 5000,
    },
  );

  const { mutate: reIndexTypesense, isPending: isReIndexingTypesense } =
    api.cache.reIndexTypesense.useMutation({
      onSuccess: (data) => {
        if (data.status === "STARTED") {
          setTypesenseStartTime(data.requestedAt);
          toast.success("Started indexing typesense");
        } else {
          toast.error("There is already a re-index in progress!");
        }
      },
    });

  const { mutate: purgeCloudflare, isPending: isPurgingCloudflare } =
    api.cache.purgeCloudflare.useMutation({
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Purged cloudflare cache");
        } else {
          toast.error("Failed to purge cloudflare cache!");
        }
      },
    });

  useEffect(() => {
    if (typesenseStatus?.status === "IDLE") {
      setTypesenseStartTime(null);
    } else if (typesenseStartTime) {
      setTypesenseStartTime(typesenseStartTime);
    }
  }, [typesenseStatus]);

  useEffect(() => {
    const update = () => {
      if (typesenseStartTime) {
        setElapsedTime(formatDuration(Date.now() - typesenseStartTime));
      } else {
        setElapsedTime(null);
      }
    };

    update();

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [typesenseStartTime]);

  return (
    <PageLayout title="Caching" backHref="/admin">
      <div className="flex flex-col gap-20">
        <div>
          <p className="text-2xl font-bold">Cloudflare Cache</p>
          <DeleteModal
            description="This action will remove all cloudflare cache and might cause performance issues."
            action="Invalidate"
            trigger={
              <Button
                className="mt-3 text-lg"
                variant="destructive"
                disabled={isPurgingCloudflare}
              >
                {isPurgingCloudflare
                  ? "Invalidating..."
                  : "Invalidate Cloudflare Cache"}
              </Button>
            }
            onDelete={() => purgeCloudflare()}
          />
        </div>

        <div>
          <p className="text-2xl font-bold">Typesense</p>
          <DeleteModal
            description="This action will re-index all typesense data."
            action="Re-index"
            trigger={
              <Button
                className="mt-3 text-lg"
                variant="destructive"
                disabled={
                  isReIndexingTypesense || typesenseStatus?.status === "BUSY"
                }
              >
                {elapsedTime
                  ? `Indexing... (${elapsedTime})`
                  : isReIndexingTypesense
                    ? "Re-indexing..."
                    : "Re-index Typesense"}
              </Button>
            }
            onDelete={() => reIndexTypesense()}
          />
        </div>
      </div>
    </PageLayout>
  );
}

export default CachingPage;
