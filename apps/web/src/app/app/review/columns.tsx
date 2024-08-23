"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowUpDown } from "lucide-react";

import { BookStatus } from "@usul-ocr/db";

dayjs.extend(relativeTime);

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Book = {
  id: string;
  arabicName?: string | null;
  englishName?: string | null;
  status: BookStatus;
  author: {
    id: string;
    arabicName: string;
    englishName?: string | null;
  };
  pdfUrl: string;
  totalPages: number;
  reviewedPages: number;
  createdAt: Date;
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
    accessorKey: "author",
    header: "Author",
    cell: ({ row }) => {
      const author = row.getValue("author") as Book["author"];
      return <div>{author.arabicName}</div>;
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
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateString = row.getValue("createdAt") as string;
      const date = dayjs(dateString).fromNow();

      return <time dateTime={dateString}>{date}</time>;
    },
  },
];
