"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
import TransliterationHelper from "@/components/transliteration-helper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import VersionsInput, {
  makeVersionsInitialState,
  Version,
} from "@/components/versions-input";
import { useUploadPdfs } from "@/hooks/useUploadPdfs";
import { textToSlug } from "@/lib/slug";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

const schema = z.object({
  arabicNames: z.array(z.string()).min(1),
  primaryArabicNameIndex: z.number().default(0),
  // arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  advancedGenres: z.array(z.string()),
  author: z.object({
    id: z.string(),
    slug: z.string(),
    arabicName: z.string(),
    transliteratedName: z.string(),
    year: z.coerce.number().optional(),
    yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
  }),
  physicalDetails: z.string().optional(),
});

export default function AddTextPage() {
  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      advancedGenres: [],
      arabicNames: [],
      primaryArabicNameIndex: 0,
    },
  });

  const [versions, setVersions] = useState<Version[]>(makeVersionsInitialState);
  const { isUploading, uploadFiles, uploadFromUrl } = useUploadPdfs();
  const [hasPhysicalDetails, setHasPhysicalDetails] = useState(false);

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

    const finalVersions: ({
      type: "pdf" | "external";
      url: string;
      splitsData?: { start: number; end: number }[];
    } & Pick<
      Version,
      | "publisher"
      | "publicationYear"
      | "investigator"
      | "editionNumber"
      | "publisherLocation"
    >)[] = [];

    for (const version of versions) {
      if (version.type === "openiti" || version.type === "turath") {
        // skip turath and openiti versions and don't send them to the backend
        continue;
      }

      if (version.type === "external") {
        if (version.url) {
          finalVersions.push(version);
        }
      } else {
        let finalPdfUrl: string | undefined;
        let finalSplitsData: { start: number; end: number }[] | undefined;
        if (version.mode === "upload") {
          if (version.files.length > 0) {
            const response = await uploadFiles(version.files, inferredSlug);
            finalPdfUrl = response?.url;
            finalSplitsData = response?.splitsData;
          }
        } else {
          if (version.url) {
            const response = await uploadFromUrl(version.url, inferredSlug);
            finalPdfUrl = response?.url;
          }
        }

        if (finalPdfUrl) {
          finalVersions.push({
            type: "pdf",
            url: finalPdfUrl,
            splitsData: finalSplitsData,
            publisher: version.publisher,
            publisherLocation: version.publisherLocation,
            publicationYear: version.publicationYear,
            investigator: version.investigator,
            editionNumber: version.editionNumber,
          });
        }
      }
    }

    const primaryArabicName = data.arabicNames[data.primaryArabicNameIndex]!;
    const otherNames = data.arabicNames.filter(
      (_, idx) => idx !== data.primaryArabicNameIndex,
    );

    await createBook({
      arabicName: primaryArabicName,
      otherNames: otherNames,
      transliteratedName: data.transliteration,
      physicalDetails: hasPhysicalDetails ? data.physicalDetails : undefined,
      advancedGenres: data.advancedGenres,
      author: { isUsul: true, slug: data.author.slug },
      versions: finalVersions,
    });
  };

  const isMutating = isUploading || isCreatingBook;

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
                      selected={field.value as any}
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

          {/* <FormField
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
          /> */}

          <FormField
            control={form.control}
            name="arabicNames"
            disabled={isMutating}
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Book Names (Arabic)</FormLabel>
                  <FormDescription>
                    Add all names that this book is known by
                  </FormDescription>
                </div>

                <FormControl>
                  <TextArrayInput
                    values={field.value}
                    setValues={field.onChange}
                    primaryIndex={form.watch("primaryArabicNameIndex")}
                    setPrimaryIndex={(index) =>
                      form.setValue("primaryArabicNameIndex", index)
                    }
                    disabled={field.disabled}
                  />
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
                    getText={() => {
                      const primaryArabicName =
                        form.watch("arabicNames")[
                          form.watch("primaryArabicNameIndex")
                        ] ?? "";
                      return primaryArabicName;
                    }}
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

          <div className="my-10 h-[2px] w-full bg-border" />

          <VersionsInput
            versions={versions}
            setVersions={setVersions}
            disabled={isMutating}
          />

          <div className="my-10 h-[2px] w-full bg-border" />

          <div>
            <h2 className="text-2xl font-bold">Physical Only</h2>

            <div className="mt-5 flex gap-2">
              <Checkbox
                id="hasPhysicalDetails"
                checked={hasPhysicalDetails}
                disabled={isMutating}
                onCheckedChange={() =>
                  setHasPhysicalDetails(!hasPhysicalDetails)
                }
              />
              <Label htmlFor="hasPhysicalDetails">
                This book doesn't have digitized copies or PDFs online
              </Label>
            </div>

            {hasPhysicalDetails && (
              <FormField
                control={form.control}
                name="physicalDetails"
                render={({ field }) => (
                  <FormItem className="mt-5">
                    <FormControl>
                      <Textarea
                        placeholder="Enter physical details"
                        disabled={isMutating}
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
