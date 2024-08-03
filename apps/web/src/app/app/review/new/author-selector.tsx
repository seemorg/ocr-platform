"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { appRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";
import { Check, ChevronsUpDown } from "lucide-react";
import { useDebounce } from "use-debounce";

type Author = inferRouterOutputs<
  typeof appRouter
>["author"]["searchAuthors"][number];

const POPOVER_WIDTH = "w-[250px]";

export function AuthorsCombobox({
  selected,
  onSelect,
}: {
  selected: Author | undefined;
  onSelect: (author: Author) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSetActive = useCallback(
    (author: Author) => {
      onSelect(author);
    },
    [onSelect],
  );

  const displayName = selected ? selected.arabicName : "Select author";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("justify-between", POPOVER_WIDTH)}
        >
          {displayName}

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent side="bottom" className={cn("p-0", POPOVER_WIDTH)}>
        <Command
          shouldFilter={false}
          className="h-auto rounded-lg border border-b-0 shadow-md"
        >
          <CommandInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search for author"
          />

          <SearchResults
            query={searchQuery}
            selectedResult={selected}
            onSelectResult={handleSetActive}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface SearchResultsProps {
  query: string;
  selectedResult: Author | undefined;
  onSelectResult: (author: Author) => void;
}

function SearchResults({
  query,
  selectedResult,
  onSelectResult,
}: SearchResultsProps) {
  const [debouncedSearchQuery] = useDebounce(query, 500);

  const { data, isLoading, isError } = api.author.searchAuthors.useQuery({
    query: debouncedSearchQuery,
  });

  return (
    <CommandList>
      {isLoading && <div className="p-4 text-sm">Searching...</div>}
      {!isError && !isLoading && !data?.length && (
        <div className="p-4 text-sm">No authors found</div>
      )}
      {isError && <div className="p-4 text-sm">Something went wrong</div>}

      {data?.map(({ id, arabicName, englishName }) => {
        return (
          <CommandItem
            key={id}
            onSelect={() => onSelectResult({ id, arabicName, englishName })}
            value={id}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                selectedResult?.id === id ? "opacity-100" : "opacity-0",
              )}
            />
            {arabicName || englishName}
          </CommandItem>
        );
      })}
    </CommandList>
  );
}
