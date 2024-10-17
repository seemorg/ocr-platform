"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
import TransliterationHelper from "@/components/transliteration-helper";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileInput, FileUploader } from "@/components/ui/file-upload";
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
import { useUploadPdfs } from "@/hooks/useUploadPdfs";
import { textToSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import AirtableSelector from "./airtable-selector";

const schema = z.object({
  _airtableReference: z.string().optional(),
  arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  advancedGenres: z.array(z.string()),
  investigator: z.string().optional(),
  publisher: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.number().optional(),
  author: z
    .object({
      _airtableReference: z.string(),
      isUsul: z.boolean(),
      usulUrl: z.string().url().optional(),
      arabicName: z.string(),
      transliteratedName: z.string(),
      diedYear: z.number().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.isUsul) {
        return;
      }
      // make it required when isUsul is false
      if (data.diedYear === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Died Year is required when author is not usul`,
          path: ["diedYear"],
        });
      }
    }),
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
      if (author?.diedYear) {
        form.setValue("author.diedYear", author.diedYear);
      } else {
        form.resetField("author.diedYear");
      }
      form.setValue("author.isUsul", author?.isUsul ?? false);
      form.setValue("author.usulUrl", author?.usulUrl ?? undefined);
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
      const response = await uploadFiles(files, inferredSlug);
      finalPdfUrl = response?.url;
      finalSplitsData = response?.splitsData;
    } else {
      const response = await uploadFromUrl(pdfUrl, inferredSlug);
      finalPdfUrl = response?.url;
    }

    if (!finalPdfUrl) return;

    await createBook({
      arabicName: data.arabicName,
      transliteratedName: data.transliteration,
      advancedGenres: data.advancedGenres,
      otherNames: data.otherNames,
      author: {
        _airtableReference: data.author._airtableReference,
        isUsul: data.author.isUsul,
        usulUrl: data.author.usulUrl,
        arabicName: data.author.arabicName,
        transliteratedName: data.author.transliteratedName,
        diedYear: data.author.diedYear,
      },
      pdfUrl: finalPdfUrl,
      splitsData: finalSplitsData ?? [],
    });
  };

  const isMutating = isUploading || isCreatingBook;
  const isUsulAuthor =
    form.getValues("author.isUsul") ||
    isLoadingAirtableReferenceCheck ||
    airtableReferenceCheck?.authorExists;

  const allFieldsDisabled =
    isLoadingAirtableReferenceCheck ||
    airtableReferenceCheck?.bookExists ||
    !airtableText;

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
                <p
                  className={cn(
                    "mt-2",
                    isUsulAuthor ? "text-green-500" : "text-red-500",
                  )}
                >
                  {isUsulAuthor
                    ? "This author is on Usul"
                    : "The author is not on Usul"}
                </p>
              )
            ) : null}
          </div>

          <FormField
            control={form.control}
            name="author.arabicName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Arabic Name</FormLabel>
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
                  <FormLabel>Author Transliterated Name</FormLabel>
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
                <FormLabel>Author Death Year</FormLabel>
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
        </div>

        <div className="my-14 h-[2px] w-full bg-border" />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
          <FormField
            control={form.control}
            name="arabicName"
            disabled={allFieldsDisabled}
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

          <FormField
            control={form.control}
            name="transliteration"
            disabled={allFieldsDisabled}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Transliterated Name</FormLabel>

                  <TransliterationHelper
                    getText={() => form.getValues("arabicName")}
                    setTransliteration={(text) => field.onChange(text)}
                    disabled={allFieldsDisabled}
                  />
                </div>
                <FormControl>
                  <Input {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="advancedGenres"
            disabled={allFieldsDisabled}
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
            disabled={allFieldsDisabled}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Names (Arabic)</FormLabel>
                <FormControl>
                  <TextArrayInput
                    values={field.value}
                    setValues={field.onChange}
                    disabled={field.disabled}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <div className="my-10 h-[2px] w-full bg-border" />

          <div>
            <h2 className="text-2xl font-bold">Publication Details</h2>
            <div className="mt-10 grid grid-cols-2 gap-10">
              <FormField
                control={form.control}
                name="investigator"
                disabled={allFieldsDisabled}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investigator (المحقق)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publisher"
                disabled={allFieldsDisabled}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publisher (دار النشر)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="editionNumber"
                disabled={allFieldsDisabled}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edition Number (رقم الطبعة)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publicationYear"
                disabled={allFieldsDisabled}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publication Year (سنة النشر)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="my-10 h-[2px] w-full bg-border" />

          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="pdfUrl">PDF</Label>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() =>
                  setPdfMode((prev) => (prev === "upload" ? "url" : "upload"))
                }
                disabled={allFieldsDisabled}
              >
                {pdfMode === "upload" ? "Mode: Upload" : "Mode: URL"}
              </Button>
            </div>

            {pdfMode === "upload" ? (
              <>
                {files.length > 0 ? (
                  <div className="my-4 flex flex-col">
                    {files.map((file, idx) => (
                      <div key={idx}>
                        <span className="flex-shrink-0">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(1)}{" "}
                          MB)
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
                  onValueChange={(newFiles) => {
                    if (isMutating || allFieldsDisabled) return;
                    setFiles(newFiles ?? []);
                  }}
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
