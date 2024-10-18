"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
import TransliterationHelper from "@/components/transliteration-helper";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileInput, FileUploader } from "@/components/ui/file-upload";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadPdfs } from "@/hooks/useUploadPdfs";
import { textToSlug } from "@/lib/slug";
import { zEmptyUrlToUndefined } from "@/lib/validation";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import AirtableSelector from "./airtable-selector";

const getSlugFromUrl = (url: string) => {
  if (!url) return null;
  return url.split("/").pop();
};

const publicationDetailsSchema = {
  investigator: z.string().optional(),
  publisher: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.coerce.number().optional(),
};

const schema = z.object({
  _airtableReference: z.string().optional(),
  arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  advancedGenres: z.array(z.string()),
  pdfVersion: z.object(publicationDetailsSchema),
  externalVersion: z.object({
    url: zEmptyUrlToUndefined,
    ...publicationDetailsSchema,
  }),
  author: z
    .object({
      isUsul: z.boolean(),
      _airtableReference: z.string(),
      arabicName: z.string(),
      transliteratedName: z.string(),
      slug: z.string().optional(),
      diedYear: z.coerce.number().optional(),
    })
    .refine(
      (data) => {
        if (data.isUsul === false && !data.diedYear) {
          return false;
        }
        return true;
      },
      {
        message: "Died year is required",
        path: ["diedYear"],
      },
    )
    .refine(
      (data) => {
        if (data.isUsul === false && !data.arabicName) {
          return false;
        }
        return true;
      },
      {
        message: "Arabic name is required",
        path: ["arabicName"],
      },
    )
    .refine(
      (data) => {
        if (data.isUsul === false && !data.transliteratedName) {
          return false;
        }
        return true;
      },
      {
        message: "Transliterated name is required",
        path: ["transliteratedName"],
      },
    ),
});

const MAX_FILE_SIZE_IN_MB = 150;
const dropzoneOptions = {
  accept: {
    "application/pdf": [".pdf"],
  },
  multiple: true,
  maxFiles: 10,
  maxSize: MAX_FILE_SIZE_IN_MB * 1024 * 1024,
} satisfies DropzoneOptions;

export default function AddTextFromAirtable() {
  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

  const { data: airtableTexts, isLoading: isLoadingAirtableTexts } =
    api.airtable.getAirtableTexts.useQuery();
  const [selectedAirtableIndex, setSelectedAirtableIndex] = useState<
    number | null
  >(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      advancedGenres: [],
      otherNames: [],
    },
  });

  const [pdfMode, setPdfMode] = useState<"upload" | "url">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const { isUploading, uploadFiles, uploadFromUrl } = useUploadPdfs();

  const airtableText = useMemo(() => {
    if (selectedAirtableIndex === null) return null;
    return airtableTexts?.[selectedAirtableIndex];
  }, [selectedAirtableIndex, airtableTexts]);

  const {
    data: airtableReferenceCheck,
    isLoading: isLoadingAirtableReferenceCheck,
  } = api.usulBook.checkAirtableReference.useQuery(
    {
      airtableReference: airtableText?._airtableReference!,
      authorAirtableReference: airtableText?.author?._airtableReference!,
    },
    { enabled: !!airtableText },
  );

  useEffect(() => {
    if (airtableText) {
      form.setValue(
        "_airtableReference",
        airtableText._airtableReference ?? undefined,
      );
      form.setValue("arabicName", airtableText.arabicName ?? "");
      form.setValue("transliteration", airtableText.transliteration ?? "");
      form.setValue("otherNames", airtableText.otherNames);

      form.setValue("externalVersion.url", airtableText.digitizedUrl ?? "");

      const advancedGenresInDb: string[] = [];
      airtableText.advancedGenres.forEach(({ name }) => {
        const advancedGenre = advancedGenres?.find(
          (genre) => genre.name === name,
        );
        if (advancedGenre && !advancedGenresInDb.includes(advancedGenre.id)) {
          advancedGenresInDb.push(advancedGenre.id);
        }
      });
      form.setValue("advancedGenres", advancedGenresInDb);

      // author part
      const author = airtableText?.author;
      form.setValue("author.arabicName", author?.arabicName ?? "");
      form.setValue("author.transliteratedName", author?.transliteration ?? "");
      form.setValue("author.diedYear", author?.diedYear ?? ("" as any));

      form.setValue("author.isUsul", author?.isUsul ?? false);

      const authorSlug = getSlugFromUrl(author?.usulUrl ?? "");
      form.setValue("author.slug", authorSlug ?? "");
      form.setValue("author._airtableReference", author?._airtableReference!);
    }
  }, [airtableText, advancedGenres]);

  const { mutateAsync: createBook, isPending: isCreatingBook } =
    api.usulBook.importFromAirtable.useMutation({
      onSuccess: () => {
        toast.success("Book created successfully!");
        // reset form
        form.reset();
        setFiles([]);
        setPdfUrl("");
        setSelectedAirtableIndex((oldIndex) =>
          oldIndex === null ? oldIndex : oldIndex + 1,
        );
      },
    });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const inferredSlug = textToSlug(data.transliteration);

    let finalPdfUrl: string | undefined;
    let finalSplitsData: { start: number; end: number }[] | undefined;
    if (pdfMode === "upload") {
      if (files.length > 0) {
        const response = await uploadFiles(files, inferredSlug);
        finalPdfUrl = response?.url;
        finalSplitsData = response?.splitsData;
      }
    } else {
      if (pdfUrl) {
        const response = await uploadFromUrl(pdfUrl, inferredSlug);
        finalPdfUrl = response?.url;
      }
    }

    // if (!finalPdfUrl) return;

    if (data.author.isUsul && !data.author.slug) {
      toast.error("Author slug is required");
      return;
    }

    await createBook({
      _airtableReference: data._airtableReference,
      arabicName: data.arabicName,
      transliteratedName: data.transliteration,
      advancedGenres: data.advancedGenres,
      otherNames: data.otherNames,
      author: data.author.isUsul
        ? {
            isUsul: true,
            slug: data.author.slug!,
          }
        : {
            isUsul: false,
            _airtableReference: data.author._airtableReference,
            arabicName: data.author.arabicName,
            transliteratedName: data.author.transliteratedName,
            diedYear: data.author.diedYear,
          },
      externalVersion: data.externalVersion,
      pdfVersion: {
        ...(finalPdfUrl ? { url: finalPdfUrl } : {}),
        ...(finalSplitsData ? { splitsData: finalSplitsData } : {}),
        ...data.pdfVersion,
      },
    });
  };

  const isMutating = isUploading || isCreatingBook;
  const isUsulBook = !!airtableReferenceCheck?.bookExists;

  const isUsulAuthor =
    form.getValues("author.isUsul") || airtableReferenceCheck?.authorExists;
  // || airtableReferenceCheck?.authorExists

  const allFieldsDisabled =
    isLoadingAirtableReferenceCheck || isUsulBook || !airtableText;

  const author = form.watch("author");
  const selectedAuthor = useMemo(() => {
    if (!author || !author.isUsul || !author.slug) return null;
    return {
      slug: author.slug,
      arabicName: author.arabicName,
      transliteratedName: author.transliteratedName,
      year: author.diedYear,
    };
  }, [form.watch("author.slug")]);

  const toggleIsUsul = () => {
    form.setValue("author.isUsul", !author.isUsul);
    form.resetField("author.slug");
    form.resetField("author.arabicName");
    form.resetField("author.transliteratedName");
    form.resetField("author.diedYear");
    form.resetField("author._airtableReference");
  };

  const onFilesChange = useCallback(
    (newFiles: File[] | null) => {
      if (isMutating || allFieldsDisabled) return;
      setFiles(newFiles ?? []);
    },
    [isMutating, allFieldsDisabled],
  );

  return (
    <PageLayout title="Import Text From Airtable" backHref="/usul">
      <div>
        {isLoadingAirtableTexts ? (
          <div>Loading...</div>
        ) : (
          <AirtableSelector
            airtableTexts={airtableTexts ?? []}
            selectedIndex={selectedAirtableIndex}
            setSelectedIndex={setSelectedAirtableIndex}
          />
        )}
      </div>

      {isUsulBook ? (
        <Alert variant="info" className="mt-10">
          This book has been added to Usul previously. You can delete or edit it
          <Link
            href={`/usul/texts/edit/${airtableReferenceCheck.bookId!}`}
            className="mx-1 underline"
          >
            here
          </Link>{" "}
          then add it again.
        </Alert>
      ) : null}

      <div className="mt-10 w-full">
        <div className="mb-2 text-2xl font-bold">Notes</div>
        {airtableText ? (
          <div className="min-w-0 break-words text-sm text-gray-500">
            {airtableText.notes}
          </div>
        ) : (
          <Alert variant="info">Select a text first.</Alert>
        )}
      </div>

      <Form {...form}>
        <div className="mt-10 flex flex-col gap-5">
          <div>
            <p className="text-2xl font-bold">Author</p>
            {airtableText ? (
              isLoadingAirtableReferenceCheck ? (
                <div>Loading...</div>
              ) : (
                <p className="mt-2 flex items-center gap-2">
                  <Checkbox
                    checked={isUsulAuthor}
                    onCheckedChange={toggleIsUsul}
                  />

                  {isUsulAuthor
                    ? "This author is on Usul"
                    : "The author is not on Usul"}
                </p>
              )
            ) : null}
          </div>

          {isUsulAuthor ? (
            <AuthorsCombobox
              selected={selectedAuthor as any}
              onSelect={(author) => {
                console.log(author);

                if (author) {
                  form.setValue("author.slug", author.slug);
                  form.setValue("author.arabicName", author.arabicName!);
                  form.setValue(
                    "author.transliteratedName",
                    author.transliteratedName!,
                  );
                  form.setValue("author.diedYear", author.year!);
                } else {
                  form.resetField("author.slug");
                  form.resetField("author.arabicName");
                  form.resetField("author.transliteratedName");
                  form.resetField("author.diedYear");
                }
              }}
            />
          ) : null}

          <FormField
            control={form.control}
            name="author.arabicName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Arabic Name (*)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isUsulAuthor || allFieldsDisabled}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author.transliteratedName"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Author Transliterated Name (*)</FormLabel>
                  {!isUsulAuthor && (
                    <TransliterationHelper
                      getText={() => form.getValues("author.arabicName")}
                      setTransliteration={(text) => field.onChange(text)}
                      disabled={allFieldsDisabled}
                    />
                  )}
                </div>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isUsulAuthor || allFieldsDisabled}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author.diedYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Death Year (*)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isUsulAuthor || allFieldsDisabled}
                    type="number"
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="my-14 h-[2px] w-full bg-border" />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
          <FormField
            control={form.control}
            name="arabicName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Book Arabic Name (*)</FormLabel>
                <FormControl>
                  <Input disabled={allFieldsDisabled} {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transliteration"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Book Transliterated Name (*)</FormLabel>

                  <TransliterationHelper
                    getText={() => form.getValues("arabicName")}
                    setTransliteration={(text) => field.onChange(text)}
                    disabled={allFieldsDisabled}
                  />
                </div>
                <FormControl>
                  <Input disabled={allFieldsDisabled} {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="advancedGenres"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Advanced Genres</FormLabel>
                <FormControl>
                  <AdvancedGenresSelector
                    selectedAdvancedGenreIds={field.value}
                    setSelectedAdvancedGenreIds={field.onChange}
                    isLoading={isLoadingAdvancedGenres}
                    advancedGenres={advancedGenres}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="otherNames"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Other Book Names (Arabic)</FormLabel>
                  <FormDescription>
                    Add other names that this book is known by
                  </FormDescription>
                </div>

                <FormControl>
                  <TextArrayInput
                    disabled={allFieldsDisabled}
                    values={field.value}
                    setValues={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <div className="my-10 h-[2px] w-full bg-border" />

          {airtableText?.pdfUrl ? (
            <div>
              <p className="text-lg">Attached PDF</p>
              <a
                href={airtableText.pdfUrl}
                target="_blank"
                className="mt-3 min-w-0 break-words text-primary underline"
              >
                {decodeURI(airtableText.pdfUrl)}
              </a>
            </div>
          ) : null}

          <div>
            <h2 className="text-2xl font-bold">Versions</h2>

            <div className="mt-5 flex flex-col gap-5">
              <div className="rounded-md bg-gray-50 px-8 py-4">
                <FormField
                  control={form.control}
                  name="externalVersion.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External URL</FormLabel>
                      <FormControl>
                        <Input disabled={allFieldsDisabled} {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <h3 className="mt-10 text-lg font-semibold">
                  Publication Details
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-10">
                  <FormField
                    control={form.control}
                    name="externalVersion.investigator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investigator (المحقق)</FormLabel>
                        <FormControl>
                          <Input disabled={allFieldsDisabled} {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="externalVersion.publisher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publisher (دار النشر)</FormLabel>
                        <FormControl>
                          <Input disabled={allFieldsDisabled} {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="externalVersion.editionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edition Number (رقم الطبعة)</FormLabel>
                        <FormControl>
                          <Input disabled={allFieldsDisabled} {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="externalVersion.publicationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Year (سنة النشر)</FormLabel>
                        <FormControl>
                          <Input
                            disabled={allFieldsDisabled}
                            {...field}
                            type="number"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="rounded-md bg-gray-50 px-8 py-4">
                <div className="flex items-center gap-2">
                  <Label className="text-lg font-semibold" htmlFor="pdfUrl">
                    PDF
                  </Label>

                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() =>
                      setPdfMode((prev) =>
                        prev === "upload" ? "url" : "upload",
                      )
                    }
                    disabled={allFieldsDisabled}
                  >
                    {pdfMode === "upload" ? "Mode: Upload" : "Mode: URL"}
                  </Button>
                </div>
                <div>
                  {pdfMode === "upload" ? (
                    <>
                      {files.length > 0 ? (
                        <div className="my-4 flex flex-col">
                          {files.map((file, idx) => (
                            <div key={idx}>
                              <span className="flex-shrink-0">
                                {file.name} (
                                {(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>

                              <Button
                                type="button"
                                onClick={() => {
                                  const newFiles = files.filter(
                                    (f, fIdx) => fIdx !== idx,
                                  );
                                  setFiles(newFiles);
                                }}
                              >
                                <XIcon className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <FileUploader
                        id="pdfUrl"
                        value={files}
                        onValueChange={onFilesChange}
                        dropzoneOptions={{
                          ...dropzoneOptions,
                          disabled: isMutating || allFieldsDisabled,
                        }}
                      >
                        <FileInput>
                          <div className="mt-4 flex h-32 w-full items-center justify-center rounded-md border bg-background">
                            <p className="text-gray-400">Drop files here</p>
                          </div>
                        </FileInput>
                      </FileUploader>
                    </>
                  ) : (
                    <div className="mt-4">
                      <Input
                        id="pdfUrl"
                        placeholder="Enter PDF Url"
                        type="url"
                        value={pdfUrl}
                        onChange={(e) => setPdfUrl(e.target.value)}
                        required
                        disabled={isMutating || allFieldsDisabled}
                      />
                    </div>
                  )}
                </div>

                <h3 className="mt-10 text-lg font-semibold">
                  Publication Details
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-10">
                  <FormField
                    control={form.control}
                    name="pdfVersion.investigator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investigator (المحقق)</FormLabel>
                        <FormControl>
                          <Input disabled={allFieldsDisabled} {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pdfVersion.publisher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publisher (دار النشر)</FormLabel>
                        <FormControl>
                          <Input disabled={allFieldsDisabled} {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pdfVersion.editionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edition Number (رقم الطبعة)</FormLabel>
                        <FormControl>
                          <Input disabled={allFieldsDisabled} {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pdfVersion.publicationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Year (سنة النشر)</FormLabel>
                        <FormControl>
                          <Input
                            disabled={allFieldsDisabled}
                            {...field}
                            type="number"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="my-10 h-[2px] w-full bg-border" />

          <div>
            <Button type="submit" disabled={isMutating || allFieldsDisabled}>
              {isUploading
                ? "Uploading files..."
                : isCreatingBook
                  ? "Submitting..."
                  : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </PageLayout>
  );
}
