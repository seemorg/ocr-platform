"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteModal } from "@/components/delete-modal";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

export type Text = {
  id: string;
  slug: string;
  arabicName?: string;
  englishName?: string;
  arabicAuthorName?: string;
  englishAuthorName?: string;
};

export const columns: ColumnDef<Text>[] = [
  {
    accessorKey: "arabicName",
    header: "Arabic Name",
  },
  {
    accessorKey: "englishName",
    header: "English Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },
  {
    header: "Author",
    cell: ({ row }) => {
      const { arabicAuthorName, englishAuthorName } = row.original;

      return (
        <div className="flex flex-col gap-1">
          <p>{arabicAuthorName}</p>
          <p>{englishAuthorName}</p>
        </div>
      );
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
          <Button asChild variant="outline">
            <Link href={`/usul/texts/${id}/edit`}>Edit</Link>
          </Button>

          <DeleteModal
            trigger={
              <Button variant="destructive" disabled={isPending}>
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            }
            onDelete={() => mutateAsync({ id })}
          />
        </div>
      );
    },
  },
];
