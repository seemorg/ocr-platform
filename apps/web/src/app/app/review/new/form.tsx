"use client";

import type { AirtableText } from "@/lib/airtable";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Check, ChevronsUpDown } from "lucide-react";
import toast from "react-hot-toast";

export default function NewBookForm({
  airtableTexts,
}: {
  airtableTexts: AirtableText[];
}) {
  const router = useRouter();
  const [selectedAirtableIndex, setSelectedAirtableIndex] = useState<
    number | null
  >(null);

  const airtableText =
    selectedAirtableIndex !== null
      ? airtableTexts[selectedAirtableIndex]
      : null;

  const { mutateAsync, isPending } = api.book.create.useMutation({
    onSuccess: () => {
      toast.success("Book created successfully");
      router.push("/app/review");
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        toast.error("Book already exists!");
      } else {
        toast.error("Something went wrong!");
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!airtableText) return;

    if (!airtableText.pdfUrl) {
      toast.error("No PDF URL found");
      return;
    }

    if (!airtableText.author) {
      toast.error("No author found");
      return;
    }

    if (!airtableText.arabicName) {
      toast.error("No Arabic name found");
      return;
    }

    await mutateAsync({
      airtableId: airtableText.id,
      pdfUrl: airtableText.pdfUrl,
      arabicName: airtableText.arabicName,
      englishName: airtableText.transliteration,
      author: {
        airtableId: airtableText.author.airtableId,
        arabicName: airtableText.author.arabicName,
      },
    });
  };

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const createLabel = (text: AirtableText) => {
    return `[${text.id}] ${text.arabicName}`;
  };

  return (
    <div className="mt-20">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[500px] max-w-full justify-between"
          >
            {value
              ? createLabel(airtableTexts[Number(value)]!)
              : "Select a text..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] max-w-full p-0">
          <Command disablePointerSelection={false}>
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
                      const newValue =
                        currentValue === value ? "" : currentValue;

                      setValue(newValue);
                      setSelectedAirtableIndex(
                        newValue ? Number(newValue) : null,
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === idx.toString() ? "opacity-100" : "opacity-0",
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

      <form onSubmit={handleSubmit} className="mt-20 flex flex-col gap-10">
        <div className="flex flex-col gap-10 sm:flex-row">
          <div className="w-full">
            <Label>Arabic Name</Label>
            <Input disabled value={airtableText?.arabicName ?? ""} />
          </div>

          <div className="w-full">
            <Label>English Name</Label>
            <Input disabled value={airtableText?.transliteration ?? ""} />
          </div>
        </div>

        <div className="flex flex-col gap-10 sm:flex-row">
          <div className="w-full">
            <Label>Author</Label>
            <Input disabled value={airtableText?.author?.arabicName ?? ""} />
          </div>

          <div className="w-full">
            <Label>PDF URL</Label>
            <Input disabled value={airtableText?.pdfUrl ?? ""} />
          </div>
        </div>

        <div>
          <Button type="submit" disabled={isPending || !airtableText}>
            {isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
