"use client";

import type { ClassNameValue } from "tailwind-merge";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";

export const YearSearchBar = ({
  className,
}: {
  className?: ClassNameValue;
}) => {
  const [isPending, startTransition] = useTransition();

  const [urlYear, setUrlYear] = useQueryState(
    "year",
    parseAsInteger.withOptions({
      clearOnDefault: true,
      shallow: false,
      startTransition,
    }),
  );

  const [year, setYear] = useState<number | null | string>(urlYear);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (year === "" || year === null) {
      setUrlYear(null);
    } else if (typeof year === "number") {
      setUrlYear(year);
    } else {
      const yearNumber = parseInt(year);
      if (!isNaN(yearNumber)) {
        setUrlYear(yearNumber);
      }
    }
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
            <CalendarIcon className="size-4" />
          )}
        </Button>
        <Input
          className="rounded-l-none"
          placeholder="Year"
          type="number"
          value={year ?? ""}
          onChange={(e) => {
            const value = e.target.value.trim();
            setYear(value === "" ? null : value);
          }}
        />
      </form>
    </div>
  );
};
