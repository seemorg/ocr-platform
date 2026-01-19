"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteModal } from "@/components/delete-modal";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { api } from "@/trpc/react";
import { ColumnDef } from "@tanstack/react-table";
import { PenBoxIcon, Trash2Icon } from "lucide-react";
import toast from "react-hot-toast";

export type Text = {
  id: string;
  arabicName?: string;
  englishName?: string;
  arabicAuthorName?: string;
  englishAuthorName?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  genres: {
    id: string;
    arabicName?: string;
  }[];
  advancedGenres: {
    id: string;
    arabicName?: string;
  }[];
};

export const columns: ColumnDef<Text>[] = [
  {
    accessorKey: "arabicName",
    header: "Name",
    cell: ({ row }) => {
      const { arabicName, englishName } = row.original;

      return (
        <div className="flex max-w-[350px] flex-col gap-1">
          <p className="truncate" title={arabicName}>
            {arabicName}
          </p>
          <p className="truncate" title={englishName}>
            {englishName}
          </p>
        </div>
      );
    },
  },
  {
    header: "Author",
    cell: ({ row }) => {
      const { arabicAuthorName, englishAuthorName } = row.original;

      return (
        <div className="flex max-w-[350px] flex-col gap-1">
          <p className="truncate" title={arabicAuthorName}>
            {arabicAuthorName}
          </p>
          <p className="truncate" title={englishAuthorName}>
            {englishAuthorName}
          </p>
        </div>
      );
    },
  },
  {
    header: "Genres",
    cell: ({ row }) => {
      const { advancedGenres } = row.original;

      return (
        <div className="flex flex-wrap gap-2">
          {advancedGenres.map((g) => (
            <Link
              key={g.id}
              href={`/usul/advanced-genres/${g.id}/edit`}
              className="rounded-md bg-muted px-2 py-1"
            >
              {g.arabicName}
            </Link>
          ))}
        </div>
      );
    },
  },
  {
    header: "Created At",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      if (!createdAt || createdAt.getTime() === 1729428682426) return "-";

      return <p>{createdAt.toLocaleDateString()}</p>;
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const { id } = row.original;
      const router = useRouter();
      const { isPending, mutateAsync } = api.usulBook.deleteBook.useMutation({
        onSuccess: () => {
          toast.success("Book deleted successfully");
          router.refresh();
        },
      });

      return (
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href={`/usul/texts/${id}/edit`}>
              <PenBoxIcon className="size-4" />
            </Link>
          </Button>

          <DeleteModal
            trigger={
              <Button variant="destructive" disabled={isPending} size="icon">
                {isPending ? (
                  <Spinner size="2xs" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
              </Button>
            }
            onDelete={() => mutateAsync({ id })}
          />
        </div>
      );
    },
  },
];
