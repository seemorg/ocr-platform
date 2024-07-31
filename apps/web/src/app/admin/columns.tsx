"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type User = {
  email: string;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    // accessorKey: "email",
    header: "Actions",
    cell: ({ row }) => {
      const { email } = row.original;
      const router = useRouter();
      const { mutateAsync, isPending } = api.whitelist.delete.useMutation({
        onSuccess: () => {
          toast.success("User deleted");
          router.refresh();
        },
        onError: (error) => {
          toast.error("Something went wrong!");
        },
      });

      return (
        <Button
          variant="destructive"
          onClick={() => mutateAsync({ email })}
          disabled={isPending}
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      );
    },
  },
];
