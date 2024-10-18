import { useState } from "react";
import DataCombobox from "@/components/data-combobox";
import { appRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";

type Author = inferRouterOutputs<
  typeof appRouter
>["usulAuthor"]["searchAuthors"][number];

export function AuthorsCombobox({
  selected,
  onSelect,
}: {
  selected: Author | null;
  onSelect: (author: Author | null) => void;
}) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { data, isLoading, isError } = api.usulAuthor.searchAuthors.useQuery({
    query: debouncedSearchQuery,
  });

  return (
    <DataCombobox
      data={data}
      isLoading={isLoading}
      isError={isError}
      onQueryChange={setDebouncedSearchQuery}
      selected={selected}
      onChange={onSelect}
      itemName={(item) => item.arabicName || item.transliteratedName}
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
