"use client";

import type { AirtableText } from "@/lib/airtable";
import { useEffect, useState } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const schema = z.object({
  airtableId: z.string().optional(),
  id: z.string(),
  arabicName: z.string().min(1),
  englishName: z.string(),
  pdfUrl: z.string().url(),
  author: z.object({
    id: z.string().optional(),
    airtableId: z.string().optional(),
    arabicName: z.string().min(1),
  }),
});

export default function NewBookForm({
  airtableTexts,
}: {
  airtableTexts: AirtableText[];
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  const router = useRouter();
  const [selectedAirtableIndex, setSelectedAirtableIndex] = useState<
    number | null
  >(null);

  const airtableText =
    selectedAirtableIndex !== null
      ? airtableTexts[selectedAirtableIndex]
      : null;

  useEffect(() => {
    if (airtableText) {
      form.setValue("airtableId", airtableText.id);
      form.setValue("arabicName", airtableText.arabicName ?? "");
      form.setValue("englishName", airtableText.transliteration ?? "");
      form.setValue("pdfUrl", airtableText.pdfUrl ?? "");
      form.setValue(
        "author.airtableId",
        airtableText.author?.airtableId ?? undefined,
      );
      form.setValue("author.arabicName", airtableText.author?.arabicName ?? "");
    }
  }, [airtableText]);

  const { mutateAsync, isPending } = api.book.create.useMutation({
    onSuccess: () => {
      toast.success("Book created successfully");
      router.push("/app/review");
      router.refresh();
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        toast.error("Book already exists!");
      } else {
        toast.error("Something went wrong!");
      }
    },
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof schema>) {
    mutateAsync({
      airtableId: values.airtableId,
      pdfUrl: values.pdfUrl,
      arabicName: values.arabicName,
      englishName: values.englishName,
      author: {
        id: values.author.id,
        airtableId: values.author.airtableId,
        arabicName: values.author.arabicName,
      },
    });
  }

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

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-20 flex flex-col gap-10"
        >
          <div className="flex flex-col gap-10 sm:flex-row">
            <div className="w-full">
              <FormField
                control={form.control}
                name="arabicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arabic Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-full">
              <FormField
                control={form.control}
                name="englishName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>English Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row">
            <div className="w-full">
              {/* <Label>Author</Label>
              <Input value={airtableText?.author?.arabicName ?? ""} />
               */}

              <FormField
                control={form.control}
                name="author.arabicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-full">
              {/* <Label>PDF URL</Label>
              <Input value={airtableText?.pdfUrl ?? ""} /> */}
              <FormField
                control={form.control}
                name="pdfUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PDF URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
