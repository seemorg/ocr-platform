"use client";

import { useCallback, useTransition } from "react";
import DataCombobox from "@/components/data-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

import { AppRouter } from "@/server/api/root";

type Region =
  inferRouterOutputs<AppRouter>["usulRegion"]["searchRegions"][number];
type Empire =
  inferRouterOutputs<AppRouter>["usulEmpire"]["searchEmpires"][number];

export const Filter = () => {
  const [isPending, startTransition] = useTransition();

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

  const selectedRegion =
    regions?.find((r) => r.id === regionQuery) ?? null;

  const handleRegionChange = useCallback(
    (region: Region | null) => {
      setRegionQuery(region?.id ?? null);
    },
    [setRegionQuery],
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

  const selectedEmpire =
    empires?.find((e) => e.id === empireQuery) ?? null;

  const handleEmpireChange = useCallback(
    (empire: Empire | null) => {
      setEmpireQuery(empire?.id ?? null);
    },
    [setEmpireQuery],
  );

  // Checkboxes
  const [showWithoutRegion, setShowWithoutRegion] = useQueryState(
    "showWithoutRegion",
    parseAsBoolean.withDefault(false).withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  const [showWithoutEmpire, setShowWithoutEmpire] = useQueryState(
    "showWithoutEmpire",
    parseAsBoolean.withDefault(false).withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">Filter:</span>
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
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-without-region"
            disabled={isPending}
            checked={showWithoutRegion ?? false}
            onCheckedChange={(checked: boolean) =>
              setShowWithoutRegion(checked)
            }
          />
          <label htmlFor="show-without-region" className="p-0 text-sm">
            Show authors without a region
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-without-empire"
            disabled={isPending}
            checked={showWithoutEmpire ?? false}
            onCheckedChange={(checked: boolean) =>
              setShowWithoutEmpire(checked)
            }
          />
          <label htmlFor="show-without-empire" className="p-0 text-sm">
            Show authors without an empire & era
          </label>
        </div>
      </div>
    </div>
  );
};
