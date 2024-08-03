"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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
import toast from "react-hot-toast";
import { useDebounce } from "use-debounce";

export default function AddBookForm({ groupId }: { groupId: string }) {
  const [selected, setSelected] = useState<Book | undefined>();
  const router = useRouter();

  const utils = api.useUtils();
  const { mutateAsync, isPending } = api.group.assignBook.useMutation({
    onSuccess: () => {
      toast.success("Book assigned to group");
      router.refresh();
      setSelected(undefined);
      utils.book.searchUnassignedBooks.reset();
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const handleSubmit = () => {
    if (!selected) return;
    mutateAsync({ bookId: selected.id, groupId });
  };

  return (
    <div className="mb-10 flex max-w-[300px] gap-2">
      <BooksCombobox selected={selected} onSelect={setSelected} />

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !selected}
      >
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}

type Book = inferRouterOutputs<
  typeof appRouter
>["book"]["searchUnassignedBooks"][number];

const POPOVER_WIDTH = "w-[250px]";

function BooksCombobox({
  selected,
  onSelect,
}: {
  selected: Book | undefined;
  onSelect: (book: Book) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSetActive = useCallback(
    (book: Book) => {
      onSelect(book);
    },
    [onSelect],
  );

  const displayName = selected ? selected.arabicName : "Select book";

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
            placeholder="Search for book"
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
  selectedResult: Book | undefined;
  onSelectResult: (book: Book) => void;
}

function SearchResults({
  query,
  selectedResult,
  onSelectResult,
}: SearchResultsProps) {
  const [debouncedSearchQuery] = useDebounce(query, 500);

  const { data, isLoading, isError } = api.book.searchUnassignedBooks.useQuery({
    query: debouncedSearchQuery,
  });

  return (
    <CommandList>
      {isLoading && <div className="p-4 text-sm">Searching...</div>}
      {!isError && !isLoading && !data?.length && (
        <div className="p-4 text-sm">No books found</div>
      )}
      {isError && <div className="p-4 text-sm">Something went wrong</div>}

      {data?.map(({ id, arabicName }) => {
        return (
          <CommandItem
            key={id}
            onSelect={() => onSelectResult({ id, arabicName })}
            value={id}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                selectedResult?.id === id ? "opacity-100" : "opacity-0",
              )}
            />
            {arabicName}
          </CommandItem>
        );
      })}
    </CommandList>
  );
}
