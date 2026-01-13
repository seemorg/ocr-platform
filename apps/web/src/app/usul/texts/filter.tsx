"use client";

import { useCallback, useTransition } from "react";
import DataCombobox from "@/components/data-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

import { AppRouter } from "@/server/api/root";

type Empire =
  inferRouterOutputs<AppRouter>["usulEmpire"]["searchEmpires"][number];
type Region =
  inferRouterOutputs<AppRouter>["usulRegion"]["searchRegions"][number];
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

  // Empire filter
  const [empireQuery, setEmpireQuery] = useQueryState(
    "empire",
    parseAsString.withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  const [empireSearchQuery, setEmpireSearchQuery] = useQueryState(
    "empireSearch",
    parseAsString.withOptions({
      clearOnDefault: true,
      shallow: true,
    }),
  );

  const {
    data: empires,
    isLoading: isLoadingEmpires,
    isError: isErrorEmpires,
  } = api.usulEmpire.searchEmpires.useQuery({
    query: empireSearchQuery ?? undefined,
  });

  const selectedEmpire = empires?.find((e) => e.id === empireQuery) ?? null;

  const handleEmpireChange = useCallback(
    (empire: Empire | null) => {
      setEmpireQuery(empire?.id ?? null);
    },
    [setEmpireQuery],
  );

  // Region filter
  const [regionQuery, setRegionQuery] = useQueryState(
    "region",
    parseAsString.withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  const [regionSearchQuery, setRegionSearchQuery] = useQueryState(
    "regionSearch",
    parseAsString.withOptions({
      clearOnDefault: true,
      shallow: true,
    }),
  );

  const {
    data: regions,
    isLoading: isLoadingRegions,
    isError: isErrorRegions,
  } = api.usulRegion.searchRegions.useQuery({
    query: regionSearchQuery ?? undefined,
  });

  const selectedRegion = regions?.find((r) => r.id === regionQuery) ?? null;

  const handleRegionChange = useCallback(
    (region: Region | null) => {
      setRegionQuery(region?.id ?? null);
    },
    [setRegionQuery],
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
            placeholder: "Select advanced genre",
            search: "Search advanced genres...",
            empty: "No advanced genres found",
          }}
          widthClassName="w-[200px]"
        />

        <DataCombobox
          data={empires}
          isLoading={isLoadingEmpires}
          isError={isErrorEmpires}
          onQueryChange={setEmpireSearchQuery}
          selected={selectedEmpire}
          onChange={handleEmpireChange}
          itemName={(item) => item.arabicName ?? item.englishName ?? ""}
          messages={{
            placeholder: "Select empire",
            search: "Search empires...",
            empty: "No empires found",
          }}
          widthClassName="w-[200px]"
        />

        <DataCombobox
          data={regions}
          isLoading={isLoadingRegions}
          isError={isErrorRegions}
          onQueryChange={setRegionSearchQuery}
          selected={selectedRegion}
          onChange={handleRegionChange}
          itemName={(item) => item.arabicName ?? item.englishName ?? ""}
          messages={{
            placeholder: "Select region",
            search: "Search regions...",
            empty: "No regions found",
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
          Show books without an advanced genre
        </label>
      </div>
    </div>
  );
};
