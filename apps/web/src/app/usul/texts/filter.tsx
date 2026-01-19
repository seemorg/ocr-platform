"use client";

import { useCallback, useTransition } from "react";
import DataCombobox from "@/components/data-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

import { AppRouter } from "@/server/api/root";

type AdvancedGenre =
  inferRouterOutputs<AppRouter>["usulAdvancedGenre"]["searchAdvancedGenres"][number];

export const Filter = () => {
  const [isPending, startTransition] = useTransition();
  const [excludeEmptyAdvancedGenre, setExcludeEmptyAdvancedGenre] =
    useQueryState(
      "excludeEmptyAdvancedGenre",
      parseAsBoolean.withDefault(false).withOptions({
        clearOnDefault: true,
        shallow: false,
        startTransition,
      }),
    );

  // Advanced Genre filter
  const [advancedGenreQuery, setAdvancedGenreQuery] = useQueryState(
    "advancedGenre",
    parseAsString.withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  const [advancedGenreSearchQuery, setAdvancedGenreSearchQuery] = useQueryState(
    "advancedGenreSearch",
    parseAsString.withOptions({
      clearOnDefault: true,
      shallow: true,
    }),
  );

  const {
    data: advancedGenres,
    isLoading: isLoadingAdvancedGenres,
    isError: isErrorAdvancedGenres,
  } = api.usulAdvancedGenre.searchAdvancedGenres.useQuery({
    query: advancedGenreSearchQuery ?? undefined,
  });

  const selectedAdvancedGenre =
    advancedGenres?.find((g) => g.id === advancedGenreQuery) ?? null;

  const handleAdvancedGenreChange = useCallback(
    (genre: AdvancedGenre | null) => {
      setAdvancedGenreQuery(genre?.id ?? null);
    },
    [setAdvancedGenreQuery],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">Filter:</span>
        <DataCombobox
          data={advancedGenres}
          isLoading={isLoadingAdvancedGenres}
          isError={isErrorAdvancedGenres}
          onQueryChange={setAdvancedGenreSearchQuery}
          selected={selectedAdvancedGenre}
          onChange={handleAdvancedGenreChange}
          itemName={(item) => item.arabicName ?? item.englishName ?? ""}
          messages={{
            placeholder: "Select genre",
            search: "Search genres...",
            empty: "No genres found",
          }}
          widthClassName="w-[200px]"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Checkbox
          id="exclude-advanced-genre"
          disabled={isPending}
          checked={excludeEmptyAdvancedGenre ?? false}
          onCheckedChange={(checked: boolean) =>
            setExcludeEmptyAdvancedGenre(checked)
          }
        />
        <label htmlFor="exclude-advanced-genre" className="p-0 text-sm">
          Show books without a genre
        </label>
      </div>
    </div>
  );
};
