"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
import TransliterationHelper from "@/components/transliteration-helper";
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
import {
  publicationDetailsSchema,
  zEmptyUrlToUndefined,
} from "@/lib/validation";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const schema = z.object({
  arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  advancedGenres: z.array(z.string()),
  externalVersion: z.object({
    url: zEmptyUrlToUndefined,
    ...publicationDetailsSchema,
  }),
  pdfVersion: z.object(publicationDetailsSchema),
  author: z.object({
    slug: z.string(),
    arabicName: z.string(),
    transliteratedName: z.string(),
    year: z.coerce.number(),
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

export default function AddTextPage() {
  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

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

  const router = useRouter();

  const { mutateAsync: createBook, isPending: isCreatingBook } =
    api.usulBook.create.useMutation({
      onSuccess: () => {
        toast.success("Book created successfully!");
        router.push("/usul/texts");
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

    await createBook({
      arabicName: data.arabicName,
      transliteratedName: data.transliteration,

      advancedGenres: data.advancedGenres,
      otherNames: data.otherNames,
      authorSlug: data.author.slug,
      externalVersion: data.externalVersion,
      pdfVersion: {
        ...(finalPdfUrl ? { url: finalPdfUrl } : {}),
        ...(finalSplitsData ? { splitsData: finalSplitsData } : {}),
        ...data.pdfVersion,
      },
    });
  };

  const isMutating = isUploading || isCreatingBook;

  const onFilesChange = useCallback(
    (newFiles: File[] | null) => {
      if (isMutating) return;
      setFiles(newFiles ?? []);
    },
    [isMutating],
  );

  return (
    <PageLayout title="Add Text" backHref="/usul/texts">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author</FormLabel>
                <FormControl>
                  <div className="block">
                    <AuthorsCombobox
                      {...field}
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                  </div>
                </FormControl>
                {field.value ? (
                  <a
                    href={`https://usul.ai/author/${field.value.slug}`}
                    target="_blank"
                    className="my-1 block text-primary underline"
                  >
                    View on Usul
                  </a>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arabicName"
            disabled={isMutating}
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
            disabled={isMutating}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Transliterated Name</FormLabel>
                  <TransliterationHelper
                    getText={() => form.getValues("arabicName")}
                    setTransliteration={(text) => field.onChange(text)}
                    disabled={isMutating}
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
            disabled={isMutating}
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
            disabled={isMutating}
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
            <h2 className="text-2xl font-bold">Versions</h2>

            <div className="mt-5 flex flex-col gap-5">
              <div className="rounded-md bg-gray-50 px-8 py-4">
                <FormField
                  control={form.control}
                  name="externalVersion.url"
                  disabled={isMutating}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External Digitized Book URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                    disabled={isMutating}
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
                    name="externalVersion.publisher"
                    disabled={isMutating}
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
                    name="externalVersion.editionNumber"
                    disabled={isMutating}
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
                    name="externalVersion.publicationYear"
                    disabled={isMutating}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Year (سنة النشر)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
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
                    disabled={isMutating}
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
                          disabled: isMutating || isMutating,
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
                        disabled={isMutating || isMutating}
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
                    name="externalVersion.investigator"
                    disabled={isMutating}
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
                    name="externalVersion.publisher"
                    disabled={isMutating}
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
                    name="externalVersion.editionNumber"
                    disabled={isMutating}
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
                    name="externalVersion.publicationYear"
                    disabled={isMutating}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Year (سنة النشر)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
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
            <Button type="submit" disabled={isMutating}>
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
