"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

import { GroupRole } from "@usul-ocr/db";

export type Membership = {
  User: {
    id: string;
    email: string | null;
  };
  groupId: string;
  createdAt: Date;
  role: GroupRole;
};

export const columns: ColumnDef<Membership>[] = [
  {
    accessorKey: "User.email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "createdAt",
    header: "Joined At",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return (
        <div>
          {createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          })}
        </div>
      );
    },
  },
  {
    // accessorKey: "email",
    header: "Actions",
    cell: ({ row }) => {
      const { role, groupId, User } = row.original;
      const router = useRouter();
      const { mutateAsync, isPending } = api.group.removeMember.useMutation({
        onSuccess: () => {
          toast.success("User removed");
          router.refresh();
        },
        onError: (error) => {
          toast.error("Something went wrong!");
        },
      });

      if (role === GroupRole.ADMIN) {
        return null;
      }

      return (
        <Button
          variant="destructive"
          onClick={() => mutateAsync({ groupId, userId: User.id })}
          disabled={isPending}
        >
          {isPending ? "Removing..." : "Remove"}
        </Button>
      );
    },
  },
];
