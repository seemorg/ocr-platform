"use client";

import type { AppRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
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
import { zEmptyUrlToUndefined } from "@/lib/validation";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileIcon, XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const publicationDetailsSchema = {
  investigator: z.string().optional(),
  publisher: z.string().optional(),
  editionNumber: z.string().optional(),
  publicationYear: z.coerce.number().optional(),
};

const schema = z.object({
  arabicName: z.string().min(1),
  englishName: z.string().min(1),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  advancedGenres: z.array(z.string()),
  externalVersion: z.object({
    url: zEmptyUrlToUndefined,
    ...publicationDetailsSchema,
  }),
  pdfVersion: z.object({
    url: z.string().url(),
    ...publicationDetailsSchema,
  }),
  author: z.object({
    slug: z.string(),
    arabicName: z.string(),
    transliteratedName: z.string().nullable(),
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

type Text = NonNullable<inferRouterOutputs<AppRouter>["usulBook"]["getById"]>;

export default function EditTextClientPage({ text }: { text: Text }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      author: text.author,
      arabicName: text.arabicName,
      transliteration: text.transliteratedName ?? "",
      englishName: text.englishName,
      advancedGenres: text.advancedGenres,
      otherNames: text.otherNames ?? [],
      externalVersion: {
        url: text.externalVersion?.value ?? "",
        ...(text.externalVersion?.publicationDetails ?? {}),
      },
      pdfVersion: {
        url: text.pdfVersion?.value ?? "",
        ...(text.pdfVersion?.publicationDetails ?? {}),
      },
    },
  });

  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

  const [pdfMode, setPdfMode] = useState<"upload" | "url">(() =>
    text.pdfVersion?.value ? "url" : "upload",
  );
  const [pdfUrl, setPdfUrl] = useState(() => text.pdfVersion?.value ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
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
    toast.error("Sorry, updating a book is not supported yet!");

    // let finalPdfUrl: string | undefined;
    // let finalSplitsData: { start: number; end: number }[] | undefined;
    // if (pdfMode === "upload") {
    //   const response = await uploadFiles(files, fileName);
    //   finalPdfUrl = response?.url;
    //   finalSplitsData = response?.splitsData;
    // } else {
    //   const response = await uploadFromUrl(pdfUrl);
    //   finalPdfUrl = response?.url;
    // }

    // if (!finalPdfUrl) return;

    // await createBook({
    //   arabicName: data.arabicName,
    //   transliteratedName: data.transliteration,
    //   slug: data.slug,
    //   advancedGenres: data.advancedGenres,
    //   otherNames: data.otherNames,
    //   authorId: data.author.id,
    //   pdfUrl: finalPdfUrl,
    //   splitsData: finalSplitsData ?? [],
    // });
  };

  const isMutating = isUploading || isCreatingBook;

  return (
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
            <FormItem
            // onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            //   const slug = textToSlug(e.target.value);
            //   form.setValue("slug", slug, {
            //     shouldValidate: true,
            //     shouldDirty: true,
            //   });
            // }}
            >
              <FormLabel>Transliterated Name</FormLabel>
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
                    <FormLabel>External URL</FormLabel>
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
                    setPdfMode((prev) => (prev === "upload" ? "url" : "upload"))
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
                      onValueChange={(f) => {
                        setFiles(f ?? []);
                      }}
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
  );
}
