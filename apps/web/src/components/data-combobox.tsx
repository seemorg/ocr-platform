"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { useDebounce } from "use-debounce";

const DEFAULT_POPOVER_WIDTH = "w-[250px]";

function DataCombobox<DataT extends { id: string } | { slug: string }>({
  data,
  isLoading,
  isError,
  onQueryChange,

  selected,
  onChange,

  itemName,
  messages: {
    placeholder: placeholder = "Select item",
    loading: loadingMessage = "Loading...",
    empty: emptyMessage = "No items found",
    error: errorMessage = "Something went wrong",
    search: searchMessage = "Search for an item",
  } = {},
  widthClassName = DEFAULT_POPOVER_WIDTH,
}: {
  data?: DataT[];
  isLoading: boolean;
  isError: boolean;
  onQueryChange: (query: string) => void;

  selected: DataT | null;
  onChange: (group: DataT | null) => void;

  itemName: keyof DataT | ((item: DataT) => React.ReactNode);
  messages?: {
    placeholder?: string;
    loading?: string;
    empty?: string;
    error?: string;
    search?: string;
  };

  widthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  useEffect(() => {
    onQueryChange(debouncedSearchQuery);
  }, [debouncedSearchQuery, onQueryChange]);

  const selectedId = !selected
    ? null
    : "id" in selected
      ? selected.id
      : selected.slug;

  const handleClick = useCallback(
    (group: DataT) => {
      if (!selectedId) return onChange(group);

      const id = "id" in group ? group.id : group.slug;
      onChange(selectedId === id ? null : group);
    },
    [onChange, selectedId],
  );

  const displayName = selected
    ? typeof itemName === "function"
      ? itemName(selected)
      : selected[itemName]
    : placeholder;

  const renderSelectedItemSeparately = useMemo(() => {
    if (!selectedId) return false;
    if (
      data?.find((group) => {
        const id = "id" in group ? group.id : group.slug;
        return selectedId === id;
      })
    )
      return false;

    return true;
  }, [selectedId, data]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("justify-between", widthClassName)}
        >
          <span
            title={typeof displayName === "string" ? displayName : ""}
            className="truncate"
          >
            {displayName as string}
          </span>

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent side="bottom" className={cn("p-0", widthClassName)}>
        <Command
          shouldFilter={false}
          className="h-auto rounded-lg border border-b-0 shadow-md"
        >
          <CommandInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder={searchMessage}
          />

          <CommandList>
            {isLoading && <div className="p-4 text-sm">{loadingMessage}</div>}
            {!isError && !isLoading && !data?.length && (
              <div className="p-4 text-sm">{emptyMessage}</div>
            )}
            {isError && <div className="p-4 text-sm">{errorMessage}</div>}

            {renderSelectedItemSeparately && (
              <CommandItem
                value={selectedId!}
                onSelect={() => handleClick(selected!)}
              >
                <Check className={cn("mr-2 h-4 w-4 opacity-100")} />

                {
                  (typeof itemName === "function"
                    ? itemName(selected!)
                    : selected![itemName]) as string
                }
              </CommandItem>
            )}

            {data?.map((group) => {
              const name =
                typeof itemName === "function"
                  ? itemName(group)
                  : group[itemName];

              const id = "id" in group ? group.id : group.slug;

              return (
                <CommandItem
                  key={id}
                  value={id}
                  onSelect={() => handleClick(group)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === id ? "opacity-100" : "opacity-0",
                    )}
                  />

                  {name as string}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default DataCombobox;
