"use client";

import type { AirtableText } from "@/lib/airtable";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { commandScore } from "@/lib/command-score";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, FileIcon, InfoIcon, XIcon } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorsCombobox } from "./author-selector";
import { FileInput, FileUploader } from "./file-upload";
import GroupsCombobox from "./group-selector";

const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

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
  groupId: z.string().optional(),
});

const mergePdfAndGetSplits = async (files: File[]) => {
  const mergedPdf = await PDFDocument.create();
  const splitsData: { start: number; end: number }[] = [];
  let currentPage = 0;

  for (let file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });

    const start = currentPage + 1;
    const end = currentPage + copiedPages.length;
    splitsData.push({ start, end });
    currentPage = end;
  }

  return { mergedPdf: await mergedPdf.save(), splitsData };
};

const MAX_FILE_SIZE_IN_MB = 150;

const dropzoneOptions = {
  accept: {
    "application/pdf": [".pdf"],
  },
  multiple: true,
  maxFiles: 10,
  maxSize: MAX_FILE_SIZE_IN_MB * 1024 * 1024,
} satisfies DropzoneOptions;

const Toggle = ({
  value,
  onChange,
  renderLabel,
}: {
  value: boolean;
  onChange: (newValue: boolean) => void;
  renderLabel: (v: boolean) => string;
}) => {
  return (
    <div className="flex items-center">
      {new Array(2).fill(null).map((_, idx) => (
        <button
          key={idx}
          type="button"
          className={cn(
            "w-full px-3 py-2 text-xs font-medium",
            value === (idx === 0)
              ? "rounded-full bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
          onClick={() => onChange(idx === 0)}
        >
          {renderLabel(idx === 0)}
        </button>
      ))}
    </div>
  );
};

export default function NewBookForm({
  airtableTexts,
}: {
  airtableTexts: AirtableText[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const { isPending: isCreatingUploadUrl, mutateAsync: createUploadUrl } =
    api.upload.createUploadUrl.useMutation({
      onError: (error) => {
        if (error.data?.code === "CONFLICT") {
          toast.error("A file with the same name already exists");
        } else {
          toast.error("Could not create upload url!");
        }
      },
    });

  const { isPending: isUploading, mutateAsync: uploadFile } = useMutation({
    mutationFn: async ({ url, file }: { url: string; file: File }) => {
      await fetch(url, {
        method: "PUT",
        body: file,
      });
    },
    onError: (error) => {
      toast.error("Could not upload file!");
    },
  });

  const { isPending: isMerging, mutateAsync: mergeFiles } = useMutation({
    mutationFn: async (files: File[]) => {
      return await mergePdfAndGetSplits(files);
    },
    onError: (error) => {
      toast.error("Could not merge files!");
    },
  });

  const [isNewAuthor, setIsNewAuthor] = useState(false);
  // const [showUpload, setShowUpload] = useState(false);

  const [selectedAuthor, setSelectedAuthor] = useState<{
    id: string;
    arabicName: string;
    englishName: string | null;
  } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    name: string;
    createdAt: Date;
  } | null>(null);

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
      form.setValue("airtableId", airtableText._airtableReference);
      form.setValue("arabicName", airtableText.arabicName ?? "");
      form.setValue("englishName", airtableText.transliteration ?? "");

      if (airtableText.author) {
        setIsNewAuthor(true);

        form.setValue(
          "author.airtableId",
          airtableText.author._airtableReference,
        );

        form.setValue(
          "author.arabicName",
          airtableText.author.arabicName ?? undefined,
        );

        form.setValue(
          "author.englishName",
          airtableText.author.transliteration ?? undefined,
        );
      }
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
    if (files.length === 0) {
      toast.error("No files uploaded");
      return;
    }

    if (!fileName) {
      toast.error("File name is required");
      return;
    }

    const { url, publicUrl } = await createUploadUrl({
      fileName,
    });

    let file: File | undefined;
    let splitsData: { start: number; end: number }[] | undefined;

    if (files.length > 1) {
      const { mergedPdf, splitsData: s } = await mergeFiles(files);
      file = new File([mergedPdf], fileName, { type: "application/pdf" });
      splitsData = s;
    } else {
      file = files[0]!;
    }

    await uploadFile({ url, file });

    return { url: publicUrl, splitsData };
  };

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof schema>) {
    // let pdfUrl: string | undefined;
    // if (showUpload) {
    //   pdfUrl = await onUpload();
    // } else {
    //   pdfUrl = values.pdfUrl;
    // }
    const pdfData = await onUpload();

    if (!pdfData) return;

    mutateAsync({
      airtableId: values.airtableId,
      pdfUrl: pdfData.url,
      splitsData: pdfData.splitsData
        ? { splits: pdfData.splitsData }
        : undefined,
      arabicName: values.arabicName,
      englishName: values.englishName,
      groupId: values.groupId,
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
              <div className="flex items-center gap-2">
                <Label>Author</Label>
                <Toggle
                  value={isNewAuthor}
                  onChange={toggleAuthorMode}
                  renderLabel={(v) => (v ? "New" : "Existing")}
                />
              </div>

              <div className="mt-4">
                {isNewAuthor ? (
                  <div className="flex flex-col gap-4">
                    <FormField
                      control={form.control}
                      name="author.airtableId"
                      render={({ field }) =>
                        field.value ? (
                          <Alert
                            className="[&>svg+div]:translate-y-0"
                            variant="info"
                          >
                            <InfoIcon className="!top-3 size-4" />
                            <AlertTitle className="mb-0">
                              Author exists in Airtable
                            </AlertTitle>
                          </Alert>
                        ) : (
                          <></>
                        )
                      }
                    />

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
                  </div>
                ) : (
                  <AuthorsCombobox
                    selected={selectedAuthor}
                    onSelect={(author) => {
                      setSelectedAuthor(author);
                      if (author) {
                        form.setValue("author", {
                          id: author.id,
                        });
                      } else {
                        form.setValue("author", {
                          airtableId: undefined,
                          arabicName: undefined,
                          englishName: undefined,
                        });
                      }
                    }}
                  />
                )}
              </div>
            </div>

            <div className="w-full">
              {/* <Toggle
                value={showUpload}
                onChange={(v) => {
                  setShowUpload(!showUpload);
                }}
              >
                {showUpload ? "From URL" : "Upload new pdf"}
              </Toggle> */}

              <Label htmlFor="pdfUrl">PDF</Label>

              {files.length > 0 ? (
                <div className="mt-4">
                  <div className="flex w-full max-w-[300px] items-center gap-2">
                    <FileIcon className="h-6 w-6" />
                    <Input
                      type="text"
                      value={fileName ?? ""}
                      onChange={(e) => setFileName(e.target.value)}
                      disabled={isCreatingUploadUrl || isUploading || isMerging}
                    />
                  </div>

                  <div className="my-4 flex flex-col">
                    {files.map((file, idx) => (
                      <div key={idx}>
                        <span className="flex-shrink-0">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(1)}{" "}
                          MB)
                        </span>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const newFiles = files.filter(
                              (f, fIdx) => fIdx !== idx,
                            );
                            setFiles(newFiles);
                            if (newFiles.length === 0) {
                              setFileName(null);
                            }
                          }}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <FileUploader
                id="pdfUrl"
                value={files}
                onValueChange={(newFiles) => {
                  if (isCreatingUploadUrl || isUploading || isMerging) return;

                  setFiles(newFiles ?? []);

                  if (newFiles && newFiles.length > 0) {
                    let name: string = form.getValues("englishName");
                    if (name) {
                      name =
                        removeDiacritics(name.trim())
                          .toLowerCase()
                          .split(" ")
                          .join("-") + ".pdf";
                    } else {
                      name = newFiles[0]!.name?.trim();
                    }

                    setFileName(name);
                  } else {
                    setFileName(null);
                  }
                }}
                dropzoneOptions={{
                  ...dropzoneOptions,
                  disabled: isCreatingUploadUrl || isUploading || isMerging,
                }}
              >
                <FileInput>
                  <div className="mt-4 flex h-32 w-full items-center justify-center rounded-md border bg-background">
                    <p className="text-gray-400">Drop files here</p>
                  </div>
                </FileInput>
              </FileUploader>
            </div>
          </div>

          <div className="w-full space-y-2">
            <div>
              <Label>Group (optional)</Label>
            </div>

            <GroupsCombobox
              selected={selectedGroup}
              onChange={(group) => {
                setSelectedGroup(group);
                if (group) {
                  form.setValue("groupId", group.id);
                } else {
                  form.setValue("groupId", undefined);
                }
              }}
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={
                isPending || isCreatingUploadUrl || isUploading || isMerging
              }
            >
              {isCreatingUploadUrl || isUploading || isMerging
                ? "Uploading files..."
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
