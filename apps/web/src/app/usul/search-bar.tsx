"use client";

import type { ClassNameValue } from "tailwind-merge";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

export const SearchBar = ({ className }: { className?: ClassNameValue }) => {
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(["exact", "contains"])
      .withDefault("contains")
      .withOptions({
        clearOnDefault: true,
        shallow: false,
        startTransition,
      }),
  );

  const [urlQuery, setUrlQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );
  const [query, setQuery] = useState(urlQuery);

  const switchMode = (mode: "contains" | "exact") => {
    setMode(mode);
    setUrlQuery(query);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUrlQuery(query);
  };

  return (
    <div className={cn("mb-10", className)}>
      <form className="flex max-w-2xl items-center" onSubmit={handleSubmit}>
        <Button
          type="submit"
          disabled={isPending}
          variant="secondary"
          size="icon"
          className="rounded-r-none"
        >
          {isPending ? (
            <Spinner size="2xs" />
          ) : (
            <SearchIcon className="size-4" />
          )}
        </Button>
        <Input
          className="rounded-l-none"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="flex items-center gap-2 text-sm">
        Mode:
        <Button
          variant="link"
          onClick={() => switchMode("contains")}
          className={cn(
            "p-0 text-sm",
            mode !== "contains" ? "text-muted-foreground" : "font-bold",
          )}
          disabled={isPending}
        >
          Contains
        </Button>
        <Button
          variant="link"
          onClick={() => switchMode("exact")}
          className={cn(
            "p-0 text-sm",
            mode !== "exact" ? "text-muted-foreground" : "font-bold",
          )}
          disabled={isPending}
        >
          Exact
        </Button>
      </div>
    </div>
  );
};
