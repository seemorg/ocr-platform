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
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, FileIcon, XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorsCombobox } from "./author-selector";
import { FileInput, FileUploader } from "./file-upload";

const schema = z.object({
  airtableId: z.string().optional(),
  arabicName: z.string().min(1),
  englishName: z.string(),
  pdfUrl: z.string().url().optional(),
  author: z.object({
    id: z.string().optional(),
    airtableId: z.string().optional(),
    arabicName: z.string().optional(),
    englishName: z.string().optional(),
  }),
});

const dropzoneOptions = {
  accept: {
    "application/pdf": [".pdf"],
  },
  multiple: false,
  maxFiles: 1,
  maxSize: 50 * 1024 * 1024, // 50 MB
} satisfies DropzoneOptions;

export default function NewBookForm({
  airtableTexts,
}: {
  airtableTexts: AirtableText[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { isPending: isCreatingUploadUrl, mutateAsync: createUploadUrl } =
    api.upload.createUploadUrl.useMutation({
      onError: (error) => {
        if (error.data?.code === "CONFLICT") {
          toast.error("A file with the same name already exists");
        } else {
          toast.error("Something went wrong!");
        }
      },
    });

  const { isPending: isUploading, mutateAsync: uploadFile } = useMutation({
    mutationFn: async (url: string) => {
      await fetch(url, {
        method: "PUT",
        body: file,
      });
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const [isNewAuthor, setIsNewAuthor] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [selectedAuthor, setSelectedAuthor] = useState<
    | {
        id: string;
        arabicName: string;
        englishName: string | null;
      }
    | undefined
  >();

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

  const onUpload = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    if (!fileName) {
      toast.error("File name is required");
      return;
    }

    const { url, publicUrl } = await createUploadUrl({
      fileName,
    });

    await uploadFile(url);

    return publicUrl;
  };

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof schema>) {
    let pdfUrl: string | undefined;
    if (showUpload) {
      pdfUrl = await onUpload();
    } else {
      pdfUrl = values.pdfUrl;
    }

    if (!pdfUrl) return;

    mutateAsync({
      airtableId: values.airtableId,
      pdfUrl,
      arabicName: values.arabicName,
      englishName: values.englishName,
      author: values.author.id
        ? {
            id: values.author.id,
          }
        : {
            airtableId: values.author.airtableId,
            arabicName: values.author.arabicName,
            englishName: values.author.englishName,
          },
    });
  }

  const toggleAuthorMode = () => {
    if (isNewAuthor) {
      form.setValue("author.airtableId", undefined);
      form.setValue("author.arabicName", undefined);
      form.setValue("author.englishName", undefined);
    } else {
      form.setValue("author.id", undefined);
    }

    setIsNewAuthor(!isNewAuthor);
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
              <Button type="button" onClick={toggleAuthorMode}>
                {isNewAuthor ? "New Author" : "Existing Author"}
              </Button>

              <div className="mt-4">
                {isNewAuthor ? (
                  <>
                    <FormField
                      control={form.control}
                      name="author.arabicName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Arabic Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="author.englishName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author English Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <AuthorsCombobox
                    selected={selectedAuthor}
                    onSelect={(author) => {
                      setSelectedAuthor(author);
                      form.setValue("author", {
                        id: author.id,
                      });
                    }}
                  />
                )}
              </div>
            </div>

            <div className="w-full">
              <Button
                type="button"
                onClick={() => {
                  setShowUpload(!showUpload);
                }}
              >
                {showUpload ? "From URL" : "Upload new pdf"}
              </Button>

              <FormField
                control={form.control}
                name="pdfUrl"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>PDF URL</FormLabel>

                    {file ? (
                      <p className="flex w-full max-w-[300px] items-center gap-2">
                        <FileIcon className="h-6 w-6" />
                        <Input
                          type="text"
                          value={fileName ?? ""}
                          onChange={(e) => setFileName(e.target.value)}
                          disabled={isCreatingUploadUrl || isUploading}
                        />

                        <span className="flex-shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setFile(null);
                            setFileName(null);
                          }}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </p>
                    ) : null}

                    <FormControl>
                      {!showUpload ? (
                        <Input {...field} />
                      ) : (
                        <FileUploader
                          value={file ? [file] : []}
                          onValueChange={(files) => {
                            if (isCreatingUploadUrl || isUploading) return;

                            const newFile = files ? files[0]! : null;
                            setFile(newFile);

                            if (newFile) {
                              setFileName(newFile.name);
                            } else {
                              setFileName(null);
                            }
                          }}
                          dropzoneOptions={{
                            ...dropzoneOptions,
                            disabled: isCreatingUploadUrl || isUploading,
                          }}
                        >
                          <FileInput>
                            <div className="flex h-32 w-full items-center justify-center rounded-md border bg-background">
                              <p className="text-gray-400">Drop files here</p>
                            </div>
                          </FileInput>
                        </FileUploader>
                      )}
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isPending || isCreatingUploadUrl || isUploading}
            >
              {isCreatingUploadUrl || isUploading
                ? "Upload files..."
                : isPending
                  ? "Submitting..."
                  : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
