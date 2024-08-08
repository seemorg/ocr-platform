"use client";

import { formatNumber } from "@/lib/utils";
import { api } from "@/trpc/react";

export default function TotalWords({ bookId }: { bookId: string }) {
  const { isPending, data } = api.book.countWordsForBook.useQuery({ bookId });

  return (
    <div className="py-5">
      {isPending || data === undefined
        ? "Loading..."
        : `${formatNumber(data)} words`}
    </div>
  );
}
