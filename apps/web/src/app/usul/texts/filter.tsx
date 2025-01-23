"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAsBoolean, useQueryState } from "nuqs";

export const Filter = () => {
  const [isPending, startTransition] = useTransition();
  const [excludeEmptyAdvancedGenre, setExcludeEmptyAdvancedGenre] = useQueryState(
    "excludeEmptyAdvancedGenre",
    parseAsBoolean.withDefault(false).withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      Filter:
      <Checkbox
        id="exclude-advanced-genre"
        disabled={isPending}
        onClick={() => setExcludeEmptyAdvancedGenre(!excludeEmptyAdvancedGenre)}
      />
      <label htmlFor="exclude-advanced-genre" className="p-0 text-sm">
        Show books without an advanced genre
      </label>
    </div>
  );
};
