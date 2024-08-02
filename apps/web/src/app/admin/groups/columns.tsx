"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";

export type Group = {
  id: string;
  name: string;
};

export const columns: ColumnDef<Group>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const { id } = row.original;

      return (
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/admin/groups/${id}/members`}>Members</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/admin/groups/${id}/books`}>Assigned Books</Link>
          </Button>
        </div>
      );
    },
  },
];
