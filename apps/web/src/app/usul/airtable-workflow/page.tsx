"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import LatestAuthorBooks from "@/components/latest-author-books";
import PageLayout from "@/components/page-layout";
import PhysicalDetails, {
  physicalDetailsSchema,
} from "@/components/physical-details";
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
import { bookVersionSchema } from "@/server/services/usul/book-versions";
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
  arabicNames: z.array(z.string()).min(1),
  primaryArabicNameIndex: z.number().min(0).default(0),
  transliteration: z.string().min(1),
  advancedGenres: z.array(z.string()),
  physicalDetails: physicalDetailsSchema,
  author: z
    .object({
      isUsul: z.boolean(),
      _airtableReference: z.string(),
      arabicNames: z.array(z.string()).min(1),
      primaryArabicNameIndex: z.number().min(0).default(0),
      transliteratedName: z.string(),
      slug: z.string().optional(),
      id: z.string().optional(),
      diedYear: z.coerce.number().optional(),
      yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
    })
    .refine(
      (data) => {
        if (data.isUsul === false && data.arabicNames.length === 0) {
          return false;
        }
        return true;
      },
      {
        message: "Arabic name is required",
        path: ["arabicNames"],
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

  const {
    airtableTexts,
    base,
    setBase,
    isLoadingAirtableTexts,
    purgeCache,
    isPurgingCache,
    selectedAirtableIndex,
    setSelectedAirtableIndex,
  } = useAirtableTexts();

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
  const {
    mutateAsync: extractPublishingDetails,
    isPending: isExtractingPublishingDetails,
  } = api.openai.extractPublishingDetails.useMutation();

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
        arabicNames: airtableText.arabicName
          ? [airtableText.arabicName, ...airtableText.otherNames]
          : [],
        primaryArabicNameIndex: 0,
        transliteration: airtableText.transliteration ?? "",
        advancedGenres: advancedGenresInDb,
        physicalDetails: airtableText.physicalDetails
          ? { type: "published", notes: airtableText.physicalDetails }
          : null,
        author: {
          isUsul: author?.isUsul ?? false,
          _airtableReference: author?._airtableReference ?? "",
          arabicNames: author?.arabicName ? [author.arabicName] : [],
          primaryArabicNameIndex: 0,
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
      onError: (error) => {
        toast.error(error.message ?? "Something went wrong");
      },
    });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const inferredSlug = textToSlug(data.transliteration);

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

    const finalVersions: z.infer<typeof bookVersionSchema>[] = [];

    for (const version of versions) {
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
          const versionUrl =
            version.type === "pdf" ? version.url : version.pdfUrl;
          if (versionUrl) {
            const response = await uploadFromUrl(versionUrl, inferredSlug);
            finalPdfUrl = response?.url;
          }
        }

        if (version.type === "pdf" && !finalPdfUrl) {
          toast.error("Could not upload version!");
          return;
        }

        const shared = {
          ...(version.id ? { id: version.id } : {}),
          publisher: version.publisher ? String(version.publisher) : undefined,
          publisherLocation: version.publisherLocation
            ? String(version.publisherLocation)
            : undefined,
          publicationYear: version.publicationYear
            ? String(version.publicationYear)
            : undefined,
          investigator: version.investigator
            ? String(version.investigator)
            : undefined,
          editionNumber: version.editionNumber
            ? String(version.editionNumber)
            : undefined,
          splitsData: finalSplitsData,
        };

        if (version.type === "pdf") {
          if (finalPdfUrl) {
            finalVersions.push({
              type: "pdf",
              url: finalPdfUrl,
              ...shared,
            });
          }
        } else {
          finalVersions.push({
            value: version.value,
            type: version.type,
            ...shared,
            pdfUrl: finalPdfUrl,
          });
        }
      }
    }

    const primaryArabicName = data.arabicNames[data.primaryArabicNameIndex]!;
    const otherArabicNames = data.arabicNames.filter(
      (_, idx) => idx !== data.primaryArabicNameIndex,
    );

    await createBook({
      _airtableReference: data._airtableReference,
      arabicName: primaryArabicName,
      otherNames: otherArabicNames,
      transliteratedName: data.transliteration,
      advancedGenres: data.advancedGenres,
      physicalDetails: hasPhysicalDetails ? data.physicalDetails : null,
      author: data.author.isUsul
        ? {
          isUsul: true,
          slug: data.author.slug!,
        }
        : {
          isUsul: false,
          _airtableReference: data.author._airtableReference,
          arabicName:
            data.author.arabicNames[data.author.primaryArabicNameIndex]!,
          otherNames: data.author.arabicNames.filter(
            (_, idx) => idx !== data.author.primaryArabicNameIndex,
          ),
          transliteratedName: data.author.transliteratedName,
          diedYear: data.author.yearStatus ? undefined : data.author.diedYear,
          yearStatus: data.author.yearStatus,
        },
      versions: finalVersions,
    });
  };

  const isMutating = isUploading || isCreatingBook;
  const isUsulBook = !!airtableReferenceCheck?.bookExists;

  const isUsulAuthor = form.getValues("author.isUsul");
  // || airtableReferenceCheck?.authorExists

  const allFieldsDisabled =
    isLoadingAirtableReferenceCheck || isUsulBook || !airtableText;

  const author = form.watch("author");

  const selectedAuthor = useMemo(() => {
    if (!author || !author.isUsul || !author.slug) return null;
    return {
      id: author.id,
      slug: author.slug,
      arabicName: author.arabicNames[author.primaryArabicNameIndex]!,
      transliteratedName: author.transliteratedName,
      year: author.diedYear,
      yearStatus: author.yearStatus,
    };
  }, [form.watch("author.slug")]);

  const handleExtractPublishingDetails = useCallback(async () => {
    if (!airtableText?.publicationDetails || allFieldsDisabled) return;

    const { result } = await extractPublishingDetails({
      text: airtableText.publicationDetails,
    });

    // update 1st version, if it does exist, add a pdf one
    if (versions[0]) {
      setVersions((old) => [
        {
          ...old[0]!,
          ...(result?.investigator && {
            investigator: result.investigator,
          }),
          ...(result?.publisher && {
            publisher: result.publisher,
          }),
          ...(result?.publisherLocation && {
            publisherLocation: result.publisherLocation,
          }),
          ...(result?.publicationYear && {
            publicationYear: String(result.publicationYear),
          }),
          ...(result?.editionNumber && {
            editionNumber: result.editionNumber,
          }),
        },
        ...old.slice(1),
      ]);
    }
  }, [airtableText, allFieldsDisabled]);

  useEffect(() => {
    handleExtractPublishingDetails();
  }, [handleExtractPublishingDetails]);

  const toggleIsUsul = () => {
    form.setValue("author.isUsul", !author.isUsul);
    form.resetField("author.slug");
    form.resetField("author.arabicNames");
    form.resetField("author.primaryArabicNameIndex");
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
  const selectedAuthorId =
    selectedAuthor?.id || airtableReferenceCheck?.authorId;

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
              base={base}
              setBase={setBase}
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
            <div className="flex items-center gap-4">
              <AuthorsCombobox
                selected={selectedAuthor as any}
                onSelect={(author) => {
                  if (author) {
                    form.setValue("author.id", author.id);
                    form.setValue("author.slug", author.slug);
                    form.setValue("author.arabicNames", [author.arabicName!]);
                    form.setValue("author.primaryArabicNameIndex", 0);
                    form.setValue(
                      "author.transliteratedName",
                      author.transliteratedName!,
                    );
                    form.setValue("author.diedYear", author.year!);
                  } else {
                    form.resetField("author.slug");
                    form.resetField("author.arabicNames");
                    form.resetField("author.primaryArabicNameIndex");
                    form.resetField("author.transliteratedName");
                    form.resetField("author.diedYear");
                  }
                }}
              />

              {selectedAuthor?.slug && (
                <a
                  href={`https://usul.ai/author/${selectedAuthor.slug}`}
                  target="_blank"
                  className="text-primary underline"
                >
                  View on Usul
                </a>
              )}

              {selectedAuthor && selectedAuthorId ? (
                <a
                  href={`/usul/authors/${selectedAuthorId}/edit`}
                  target="_blank"
                  className="text-primary underline"
                >
                  View on Internal Tool
                </a>
              ) : null}
            </div>
          ) : null}

          <FormField
            control={form.control}
            name="author.arabicNames"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Names (Arabic) *</FormLabel>
                <FormControl>
                  <TextArrayInput
                    values={field.value ?? []}
                    setValues={field.onChange}
                    primaryIndex={
                      form.watch("author.primaryArabicNameIndex") ?? 0
                    }
                    setPrimaryIndex={(idx) =>
                      form.setValue("author.primaryArabicNameIndex", idx)
                    }
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
                      getText={() => {
                        const primaryArabicName =
                          form.watch("author.arabicNames")?.[
                          form.watch("author.primaryArabicNameIndex")
                          ];
                        return primaryArabicName ?? "";
                      }}
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

          {isUsulAuthor && (
            <LatestAuthorBooks authorSlug={form.watch("author.slug")} />
          )}
        </div>

        <div className="my-14 h-[2px] w-full bg-border" />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
          <FormField
            control={form.control}
            name="arabicNames"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Book Names (Arabic) *</FormLabel>
                  <FormDescription>
                    Add all names that this book is known by
                  </FormDescription>
                </div>

                <FormControl>
                  <TextArrayInput
                    disabled={allFieldsDisabled}
                    values={field.value}
                    setValues={field.onChange}
                    primaryIndex={form.watch("primaryArabicNameIndex")}
                    setPrimaryIndex={(idx) =>
                      form.setValue("primaryArabicNameIndex", idx)
                    }
                  />
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
                    getText={() => {
                      const primaryArabicName =
                        form.watch("arabicNames")?.[
                        form.watch("primaryArabicNameIndex")
                        ];
                      return primaryArabicName ?? "";
                    }}
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
                <FormLabel>Genres</FormLabel>
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

          {airtableText?.publicationDetails ? (
            <div>
              <p className="text-lg">Attached Publication Details</p>
              <p className="mt-3 min-w-0 break-words">
                {airtableText.publicationDetails}
              </p>

              <Button type="button" onClick={handleExtractPublishingDetails}>
                {isExtractingPublishingDetails
                  ? "Extracting..."
                  : "Extract Publishing Details"}
              </Button>
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
              <div className="mt-5">
                <PhysicalDetails form={form} disabled={allFieldsDisabled} />
              </div>
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
