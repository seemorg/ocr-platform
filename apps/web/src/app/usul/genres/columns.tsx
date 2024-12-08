"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteModal } from "@/components/delete-modal";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

export type Genre = {
  id: string;
  slug: string;
  arabicName?: string;
  englishName?: string;
  numberOfBooks: number;
};

export const columns: ColumnDef<Genre>[] = [
  {
    accessorKey: "arabicName",
    header: "Arabic Name",
  },
  {
    accessorKey: "englishName",
    header: "English Name",
  },
  {
    accessorKey: "numberOfBooks",
    header: "Books",
    cell: ({ row }) => {
      const { numberOfBooks, id } = row.original;
      return (
        <Link
          href={`/usul/texts?genre=${id}`}
          className="text-primary underline"
        >
          {numberOfBooks} (View)
        </Link>
      );
    },
  },
  {
    accessorKey: "slug",
    header: "Usul",
    cell: ({ row }) => {
      const { slug } = row.original;
      return (
        <a
          target="_blank"
          href={`https://usul.ai/genres/${slug}`}
          className="text-primary underline"
        >
          View on Usul
        </a>
      );
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const { id } = row.original;
      const router = useRouter();
      const { isPending, mutateAsync } = api.usulGenre.delete.useMutation({
        onSuccess: () => {
          toast.success("Genre deleted successfully");
          router.refresh();
        },
      });

      return (
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/usul/genres/${id}/edit`}>Edit</Link>
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
