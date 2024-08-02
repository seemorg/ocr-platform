"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

import { BookStatus } from "@usul-ocr/db";

export type Book = {
  id: string;
  arabicName?: string | null;
  englishName?: string | null;
  status: BookStatus;
  pdfUrl: string;
  totalPages: number;
  reviewedPages: number;
};

export const bookStatusToName = {
  [BookStatus.UNPROCESSED]: "Unprocessed",
  [BookStatus.PROCESSING]: "Processing",
  [BookStatus.IN_REVIEW]: "In Review",
  [BookStatus.COMPLETED]: "Completed",
};

export const columns: ColumnDef<Book>[] = [
  {
    accessorKey: "viewPages",
    header: "View Pages",
    cell: ({ row }) => {
      return <Link href={`/app/review/${row.original.id}`}>View Pages</Link>;
    },
  },
  {
    accessorKey: "arabicName",
    header: "Name",
    cell: ({ row }) => {
      return row.getValue("arabicName") ?? "-";
    },
  },
  {
    accessorKey: "englishName",
    header: "English Name",
    cell: ({ row }) => {
      return row.getValue("englishName") ?? "-";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as BookStatus;
      return (
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            {
              [BookStatus.UNPROCESSED]: "bg-red-200 text-red-700",
              [BookStatus.PROCESSING]: "bg-blue-200 text-blue-700",
              [BookStatus.IN_REVIEW]: "bg-yellow-200 text-yellow-700",
              [BookStatus.COMPLETED]: "bg-green-200 text-green-700",
            }[status],
          )}
        >
          {bookStatusToName[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "totalPages",
    header: "Total Pages",
  },
  {
    accessorKey: "reviewedPages",
    header: "Reviewed Pages",
  },
  {
    accessorKey: "pdfUrl",
    header: "PDF",
    cell: ({ row }) => {
      const pdfUrl = row.getValue("pdfUrl") as string;
      return (
        <a href={pdfUrl} target="_blank" className="text-primary underline">
          View
        </a>
      );
    },
  },
];
