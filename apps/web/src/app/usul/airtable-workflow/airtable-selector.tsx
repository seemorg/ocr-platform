import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { airtableBases } from "@/hooks/useAirtableTexts";
import { AirtableText } from "@/lib/airtable";
import { commandScore } from "@/lib/command-score";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDownIcon } from "lucide-react";

const createLabel = (text: AirtableText) => {
  return `[${text.id}] ${text.arabicName}`;
};

export default function AirtableSelector({
  airtableTexts,
  selectedIndex,
  setSelectedIndex,
  base,
  setBase,
}: {
  airtableTexts: AirtableText[];
  selectedIndex: number | null;
  setSelectedIndex: (value: number | null) => void;
  base?: (typeof airtableBases)[number];
  setBase?: (value: (typeof airtableBases)[number]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        {base && (
          <Select value={base} onValueChange={setBase}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Select a base" />
            </SelectTrigger>

            <SelectContent>
              {airtableBases.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[500px] max-w-full justify-between"
          >
            {selectedIndex !== null
              ? createLabel(airtableTexts[selectedIndex]!)
              : "Select a text..."}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-[500px] max-w-full p-0">
        <Command
          disablePointerSelection={false}
          filter={(_, search, keywords) => {
            if (!keywords) return 0;
            if (keywords.includes(search)) return 1;

            return Math.max(
              ...keywords.map((keyword) => commandScore(keyword, search)),
            );
          }}
        >
          <CommandInput placeholder="Search text..." />
          <CommandEmpty>No text found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {airtableTexts.map((text, idx) => (
                <CommandItem
                  key={idx.toString()}
                  value={idx.toString()}
                  keywords={[
                    text.id.toString(),
                    text.arabicName ?? "",
                    text.transliteration ?? "",
                  ]}
                  onSelect={(currentValue) => {
                    const currentValueNumber = Number(currentValue);
                    const newValue =
                      currentValueNumber === selectedIndex
                        ? null
                        : currentValueNumber;

                    setSelectedIndex(newValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIndex === idx ? "opacity-100" : "opacity-0",
                    )}
                  />

                  {createLabel(text)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
