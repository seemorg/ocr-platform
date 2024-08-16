"use client";

import { useState } from "react";
import DataCombobox from "@/components/data-combobox";
import { appRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";

type Group = inferRouterOutputs<typeof appRouter>["group"]["search"][number];

export default function GroupsCombobox({
  selected,
  onChange,
}: {
  selected: Group | null;
  onChange: (group: Group | null) => void;
}) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { data, isLoading, isError } = api.group.search.useQuery({
    query: debouncedSearchQuery,
  });

  return (
    <DataCombobox
      data={data}
      isLoading={isLoading}
      isError={isError}
      onQueryChange={setDebouncedSearchQuery}
      selected={selected}
      onChange={onChange}
      itemName="name"
      messages={{
        placeholder: "Select group",
        loading: "Loading groups...",
        empty: "No groups found",
        error: "Something went wrong",
        search: "Search for a group",
      }}
    />
  );
}
