"use client";

import { useState } from "react";
import DataCombobox from "@/components/data-combobox";
import { appRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";

type Author = inferRouterOutputs<
  typeof appRouter
>["author"]["searchAuthors"][number];

export function AuthorsCombobox({
  selected,
  onSelect,
}: {
  selected: Author | null;
  onSelect: (author: Author | null) => void;
}) {
  const [debouncedSearchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError } = api.author.searchAuthors.useQuery({
    query: debouncedSearchQuery,
  });

  return (
    <DataCombobox
      data={data}
      isLoading={isLoading}
      isError={isError}
      onQueryChange={setSearchQuery}
      selected={selected}
      onChange={onSelect}
      itemName={(item) => item.arabicName || item.englishName}
      messages={{
        placeholder: "Select author",
        loading: "Loading authors...",
        empty: "No authors found",
        error: "Something went wrong",
        search: "Search for an author",
      }}
    />
  );
}
