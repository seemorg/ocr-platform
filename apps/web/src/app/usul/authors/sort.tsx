"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseAsStringLiteral, useQueryState } from "nuqs";

const SORT_OPTIONS = [
  { value: "year-asc", label: "Year (asc)" },
  { value: "year-desc", label: "Year (desc)" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const AuthorSort = () => {
  const [isPending, startTransition] = useTransition();
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_OPTIONS.map((o) => o.value)).withOptions({
      shallow: false,
      startTransition,
    }),
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      Sort:
      <Select
        disabled={isPending}
        value={(sort || "none") as string}
        onValueChange={(value) =>
          setSort(value === "none" ? null : (value as SortOption))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
