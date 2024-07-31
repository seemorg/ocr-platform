"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Page = {
  id: string;
  bookId: string;
  pdfPageNumber: number;
  pageNumber?: number | null;
  reviewer?: {
    id: string;
    email: string;
  } | null;
  reviewedAt?: Date | null;
};

export const columns: ColumnDef<Page>[] = [
  {
    accessorKey: "viewContent",
    header: "View Content",
    cell: ({ row }) => {
      return (
        <Link
          href={`/app/${row.original.bookId}/${row.original.pdfPageNumber}`}
        >
          View Content
        </Link>
      );
    },
  },
  {
    accessorKey: "pdfPageNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          PDF Page Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "pageNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Page Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const pdfPageNumber = row.getValue(
        "pdfPageNumber",
      ) as Page["pdfPageNumber"];
      return <span>{pdfPageNumber ? pdfPageNumber : "-"}</span>;
    },
  },
  {
    filterFn: "hasReviewer" as any,
    accessorKey: "reviewer",
    header: "Reviewer",
    cell: ({ row }) => {
      const reviewer = row.getValue("reviewer") as Page["reviewer"];
      return <span>{reviewer ? reviewer.email : "-"}</span>;
    },
  },
  {
    accessorKey: "reviewedAt",
    header: "Reviewed At",
    cell: ({ row }) => {
      const reviewedAt = row.getValue("reviewedAt") as Page["reviewedAt"];
      return (
        <span>
          {reviewedAt
            ? reviewedAt.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </span>
      );
    },
  },
];
