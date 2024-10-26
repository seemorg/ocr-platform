"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
import TransliterationHelper from "@/components/transliteration-helper";
import { Alert } from "@/components/ui/alert";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import VersionsInput, {
  makeVersionsInitialState,
  Version,
} from "@/components/versions-input";
import useAirtableTexts from "@/hooks/useAirtableTexts";
import { useUploadPdfs } from "@/hooks/useUploadPdfs";
import { textToSlug } from "@/lib/slug";
import { zEmptyUrlToUndefined } from "@/lib/validation";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcwIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

import AirtableSelector from "./airtable-selector";

const getSlugFromUrl = (url: string) => {
  if (!url) return null;
  return url.split("/").pop();
};

const schema = z.object({
  _airtableReference: z.string().optional(),
  arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  advancedGenres: z.array(z.string()),
  physicalDetails: z.string().optional(),
  author: z
    .object({
      isUsul: z.boolean(),
      _airtableReference: z.string(),
      arabicName: z.string(),
      transliteratedName: z.string(),
      slug: z.string().optional(),
      diedYear: z.coerce.number().optional(),
      yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
    })
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

export default function AddTextFromAirtable() {
  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

  const { airtableTexts, isLoadingAirtableTexts, purgeCache, isPurgingCache } =
    useAirtableTexts();

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

  const [versions, setVersions] = useState<Version[]>(makeVersionsInitialState);
  const { isUploading, uploadFiles, uploadFromUrl } = useUploadPdfs();
  const [hasPhysicalDetails, setHasPhysicalDetails] = useState(false);

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
      const advancedGenresInDb: string[] = [];
      airtableText.advancedGenres.forEach(({ name }) => {
        const advancedGenre = advancedGenres?.find(
          (genre) => genre.name === name,
        );
        if (advancedGenre && !advancedGenresInDb.includes(advancedGenre.id)) {
          advancedGenresInDb.push(advancedGenre.id);
        }
      });

      const author = airtableText?.author;
      const authorSlug = getSlugFromUrl(author?.usulUrl ?? "");
      const diedYear = author?.diedYear;
      form.reset({
        _airtableReference: airtableText._airtableReference ?? undefined,
        arabicName: airtableText.arabicName ?? "",
        transliteration: airtableText.transliteration ?? "",
        otherNames: airtableText.otherNames,
        advancedGenres: advancedGenresInDb,
        physicalDetails: airtableText.physicalDetails ?? undefined,
        author: {
          isUsul: author?.isUsul ?? false,
          _airtableReference: author?._airtableReference ?? "",
          arabicName: author?.arabicName ?? "",
          transliteratedName: author?.transliteration ?? "",
          diedYear: diedYear ?? undefined,
          yearStatus: diedYear ? undefined : AuthorYearStatus.Unknown,
          slug: authorSlug ?? "",
        },
      });

      if (airtableText.digitizedUrl) {
        setVersions([
          {
            type: "external",
            url: airtableText.digitizedUrl,
          },
        ]);
      } else {
        setVersions(makeVersionsInitialState);
      }

      setHasPhysicalDetails(!!airtableText.physicalDetails);
    }
  }, [airtableText, advancedGenres]);

  const { mutateAsync: createBook, isPending: isCreatingBook } =
    api.usulBook.create.useMutation({
      onSuccess: () => {
        toast.success("Book created successfully!");
        // reset form
        form.reset();
        setVersions(makeVersionsInitialState);
        setHasPhysicalDetails(false);
        setSelectedAirtableIndex((oldIndex) =>
          oldIndex === null ? oldIndex : oldIndex + 1,
        );
      },
      onError: () => {
        toast.error("Something went wrong");
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

    if (data.author.isUsul && !data.author.slug) {
      toast.error("Author slug is required");
      return;
    }

    if (
      !data.author.isUsul &&
      !data.author.yearStatus &&
      !data.author.diedYear
    ) {
      toast.error("Author death year or year status is required");
      return;
    }

    await createBook({
      _airtableReference: data._airtableReference,
      arabicName: data.arabicName,
      transliteratedName: data.transliteration,
      advancedGenres: data.advancedGenres,
      otherNames: data.otherNames,
      physicalDetails: hasPhysicalDetails ? data.physicalDetails : undefined,
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
            diedYear: data.author.yearStatus ? undefined : data.author.diedYear,
            yearStatus: data.author.yearStatus,
          },
      versions: finalVersions,
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
      yearStatus: author.yearStatus,
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

  const setAuthorYearStatus = (checked: boolean, status: AuthorYearStatus) => {
    if (checked) {
      form.setValue("author.yearStatus", status);
      form.setValue("author.diedYear", undefined);
    } else {
      form.setValue("author.yearStatus", undefined);
      form.setValue(
        "author.diedYear",
        selectedAuthor?.year ?? airtableText?.author?.diedYear ?? 0,
      );
    }
  };

  const currentYearStatus = form.watch("author.yearStatus");

  return (
    <PageLayout title="Import Text From Airtable" backHref="/usul">
      <div>
        {isLoadingAirtableTexts ? (
          <div>Loading...</div>
        ) : (
          <div className="flex items-center gap-2">
            <AirtableSelector
              airtableTexts={airtableTexts ?? []}
              selectedIndex={selectedAirtableIndex}
              setSelectedIndex={setSelectedAirtableIndex}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => purgeCache()}
                  disabled={isPurgingCache}
                >
                  <RefreshCcwIcon className="mr-2 h-4 w-4" />{" "}
                  {isPurgingCache ? "Purging..." : "Refresh"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Click on this if the airtable data is not up to date
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {isUsulBook ? (
        <Alert variant="info" className="mt-10">
          This book has been added to Usul previously. You can delete or edit it
          <Link
            href={`/usul/texts/${airtableReferenceCheck.bookId!}/edit`}
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
                  This author is on Usul
                </p>
              )
            ) : null}
          </div>

          {isUsulAuthor ? (
            <AuthorsCombobox
              selected={selectedAuthor as any}
              onSelect={(author) => {
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
                <FormLabel>Author Arabic Name *</FormLabel>
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
                  <FormLabel>Author Transliterated Name *</FormLabel>
                  {!isUsulAuthor && (
                    <TransliterationHelper
                      getText={() => form.watch("author.arabicName")}
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

                <div>
                  <div className="mt-2 flex gap-2">
                    <Checkbox
                      id="authorAlive"
                      checked={currentYearStatus === AuthorYearStatus.Alive}
                      onCheckedChange={(checked) =>
                        setAuthorYearStatus(
                          Boolean(checked),
                          AuthorYearStatus.Alive,
                        )
                      }
                      disabled={isUsulAuthor || allFieldsDisabled}
                    />
                    <Label htmlFor="authorAlive">Author is alive</Label>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <Checkbox
                      id="authorUnknown"
                      checked={currentYearStatus === AuthorYearStatus.Unknown}
                      onCheckedChange={(checked) =>
                        setAuthorYearStatus(
                          Boolean(checked),
                          AuthorYearStatus.Unknown,
                        )
                      }
                      disabled={isUsulAuthor || allFieldsDisabled}
                    />
                    <Label htmlFor="authorUnknown">
                      Author's death year is unknown
                    </Label>
                  </div>
                </div>

                {!currentYearStatus && (
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isUsulAuthor || allFieldsDisabled}
                      type="number"
                    />
                  </FormControl>
                )}

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
                <FormLabel>Book Arabic Name *</FormLabel>
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
                  <FormLabel>Book Transliterated Name *</FormLabel>

                  <TransliterationHelper
                    getText={() => form.watch("arabicName")}
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

          <VersionsInput
            versions={versions}
            setVersions={setVersions}
            disabled={isMutating || allFieldsDisabled}
          />

          <div className="my-10 h-[2px] w-full bg-border" />

          <div>
            <h2 className="text-2xl font-bold">Physical Only</h2>
            <div className="mt-5 flex gap-2">
              <Checkbox
                id="hasPhysicalDetails"
                checked={hasPhysicalDetails}
                disabled={allFieldsDisabled}
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
                        disabled={allFieldsDisabled}
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
