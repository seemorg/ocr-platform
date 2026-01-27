"use client";

import type { AppRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import LatestAuthorBooks from "@/components/latest-author-books";
import PageLayout from "@/components/page-layout";
import PhysicalDetails, {
  physicalDetailsSchema,
} from "@/components/physical-details";
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
import DataCombobox from "@/components/data-combobox";
import { useUploadPdfs } from "@/hooks/useUploadPdfs";
import { textToSlug } from "@/lib/slug";
import { bookVersionSchema } from "@/server/services/usul/book-versions";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

type Empire =
  inferRouterOutputs<AppRouter>["usulEmpire"]["searchEmpires"][number];
type Region =
  inferRouterOutputs<AppRouter>["usulRegion"]["searchRegions"][number];

const schema = z.object({
  arabicNames: z.array(z.string()).min(1),
  primaryArabicNameIndex: z.number().default(0),
  transliteration: z.string().min(1),
  advancedGenres: z.array(z.string()),
  author: z
    .object({
      isUsul: z.boolean(),
      arabicNames: z.array(z.string()).min(1),
      primaryArabicNameIndex: z.number().min(0).default(0),
      transliteratedName: z.string(),
      slug: z.string().optional(),
      id: z.string().optional(),
      diedYear: z.coerce.number().optional(),
      yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
      arabicBio: z.string().optional(),
      empireIds: z.array(z.string()).optional(),
      regionIds: z.array(z.string()).optional(),
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
  physicalDetails: physicalDetailsSchema,
});

export default function AddTextPage() {
  const [empireSearchQuery, setEmpireSearchQuery] = useState<string>("");
  const [regionSearchQuery, setRegionSearchQuery] = useState<string>("");
  const [selectedEmpires, setSelectedEmpires] = useState<Empire[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);

  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

  const {
    data: empires,
    isLoading: isLoadingEmpires,
    isError: isErrorEmpires,
  } = api.usulEmpire.searchEmpires.useQuery({
    query: empireSearchQuery || undefined,
  });

  const {
    data: regions,
    isLoading: isLoadingRegions,
    isError: isErrorRegions,
  } = api.usulRegion.searchRegions.useQuery({
    query: regionSearchQuery || undefined,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      advancedGenres: [],
      arabicNames: [],
      primaryArabicNameIndex: 0,
      author: {
        isUsul: false,
        empireIds: [],
        regionIds: [],
      },
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
      onError: (error) => {
        const errorMessage =
          error.data?.zodError?.fieldErrors
            ? "Please check the form for errors"
            : error.message || "Failed to create book";
        toast.error(errorMessage);
        console.error("Book creation error:", error);
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
          id: version.id,
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
            ...(finalPdfUrl ? { pdfUrl: finalPdfUrl } : {}),
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
      physicalDetails: hasPhysicalDetails ? data.physicalDetails : null,
      advancedGenres: data.advancedGenres,
      author: data.author.isUsul
        ? {
          isUsul: true,
          slug: data.author.slug!,
        }
        : {
          isUsul: false,
          arabicName:
            data.author.arabicNames[data.author.primaryArabicNameIndex]!,
          otherNames: data.author.arabicNames.filter(
            (_, idx) => idx !== data.author.primaryArabicNameIndex,
          ),
          transliteratedName: data.author.transliteratedName,
          diedYear: data.author.yearStatus ? undefined : data.author.diedYear,
          yearStatus: data.author.yearStatus,
          arabicBio: data.author.arabicBio,
          empires: selectedEmpires.map((e) => e.id),
          regions: selectedRegions.map((r) => r.id),
        },
      versions: finalVersions,
    });
  };

  const isMutating = isUploading || isCreatingBook;

  const toggleIsUsul = () => {
    form.setValue("author.isUsul", !form.getValues("author.isUsul"));
    form.resetField("author.slug");
    form.resetField("author.arabicNames");
    form.resetField("author.primaryArabicNameIndex");
    form.resetField("author.transliteratedName");
    form.resetField("author.diedYear");
    form.resetField("author.arabicBio");
    setSelectedEmpires([]);
    setSelectedRegions([]);
  };

  const setAuthorYearStatus = (checked: boolean, status: AuthorYearStatus) => {
    if (checked) {
      form.setValue("author.yearStatus", status);
      form.setValue("author.diedYear", undefined);
    } else {
      form.setValue("author.yearStatus", undefined);
      form.setValue("author.diedYear", selectedAuthor?.year ?? 0);
    }
  };

  const author = form.watch("author");
  const currentYearStatus = form.watch("author.yearStatus");
  const isUsulAuthor = author?.isUsul;
  const selectedAuthor = useMemo(() => {
    if (!author || !author.isUsul || !author.slug) return null;
    return {
      id: author.id,
      slug: author.slug,
      arabicName:
        author.arabicNames && author.arabicNames.length > 0
          ? author.arabicNames[author.primaryArabicNameIndex]
          : null,
      transliteratedName: author.transliteratedName,
      year: author.diedYear,
      yearStatus: author.yearStatus,
    };
  }, [form.watch("author.slug")]);
  const selectedAuthorId = selectedAuthor?.id;

  return (
    <PageLayout title="Add Text" backHref="/usul/texts">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
          <div className="mt-10 flex flex-col gap-5">
            <div>
              <p className="text-2xl font-bold">Author</p>

              <p className="mt-2 flex items-center gap-2">
                <Checkbox
                  checked={isUsulAuthor}
                  onCheckedChange={toggleIsUsul}
                />
                This author is on Usul
              </p>
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
                      disabled={isUsulAuthor || isMutating}
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
                            form.watch("author.primaryArabicNameIndex") ?? 0
                            ] ?? "";
                          return primaryArabicName;
                        }}
                        setTransliteration={(text) => field.onChange(text)}
                        disabled={isMutating}
                      />
                    )}
                  </div>
                  <FormControl>
                    <Input {...field} disabled={isUsulAuthor || isMutating} />
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
                        disabled={isUsulAuthor || isMutating}
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
                        disabled={isUsulAuthor || isMutating}
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
                        disabled={isUsulAuthor || isMutating}
                        type="number"
                      />
                    </FormControl>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {!isUsulAuthor && (
              <>
                <FormField
                  control={form.control}
                  name="author.arabicBio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biography (Arabic)</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-40"
                          {...field}
                          disabled={isMutating}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Empires</Label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedEmpires.map((empire) => (
                        <div
                          key={empire.id}
                          className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5"
                        >
                          <span className="text-sm">
                            {empire.arabicName ?? empire.englishName ?? ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEmpires((prev) =>
                                prev.filter((e) => e.id !== empire.id),
                              )
                            }
                            className="text-muted-foreground hover:text-foreground"
                            disabled={isMutating}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <DataCombobox<Empire>
                      data={empires}
                      isLoading={isLoadingEmpires}
                      isError={isErrorEmpires}
                      onQueryChange={setEmpireSearchQuery}
                      selected={null}
                      onChange={(empire) => {
                        if (
                          empire &&
                          !selectedEmpires.find((e) => e.id === empire.id)
                        ) {
                          setSelectedEmpires((prev) => [...prev, empire]);
                        }
                      }}
                      itemName={(item) => {
                        const isSelected = selectedEmpires.find(
                          (e) => e.id === item.id,
                        );
                        const name = item.arabicName ?? item.englishName ?? "";
                        return isSelected ? `✓ ${name}` : name;
                      }}
                      messages={{
                        placeholder: "Add empire",
                        search: "Search empires...",
                        empty: "No empires found",
                      }}
                      widthClassName="w-[300px]"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Regions</Label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedRegions.map((region) => (
                        <div
                          key={region.id}
                          className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5"
                        >
                          <span className="text-sm">
                            {region.arabicName ?? region.englishName ?? ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRegions((prev) =>
                                prev.filter((r) => r.id !== region.id),
                              )
                            }
                            className="text-muted-foreground hover:text-foreground"
                            disabled={isMutating}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <DataCombobox<Region>
                      data={regions}
                      isLoading={isLoadingRegions}
                      isError={isErrorRegions}
                      onQueryChange={setRegionSearchQuery}
                      selected={null}
                      onChange={(region) => {
                        if (
                          region &&
                          !selectedRegions.find((r) => r.id === region.id)
                        ) {
                          setSelectedRegions((prev) => [...prev, region]);
                        }
                      }}
                      itemName={(item) => {
                        const isSelected = selectedRegions.find(
                          (r) => r.id === item.id,
                        );
                        const name = item.arabicName ?? item.englishName ?? "";
                        return isSelected ? `✓ ${name}` : name;
                      }}
                      messages={{
                        placeholder: "Add region",
                        search: "Search regions...",
                        empty: "No regions found",
                      }}
                      widthClassName="w-[300px]"
                    />
                  </div>
                </div>
              </>
            )}

            {isUsulAuthor && (
              <LatestAuthorBooks authorSlug={form.watch("author.slug")} />
            )}
          </div>

          <div className="my-14 h-[2px] w-full bg-border" />

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
                        form.watch("arabicNames")?.[
                        form.watch("primaryArabicNameIndex") ?? 0
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
                onCheckedChange={(checked) => {
                  setHasPhysicalDetails(!!checked);
                  if (!checked) {
                    form.setValue("physicalDetails", null);
                  } else {
                    form.setValue("physicalDetails", { type: "published" });
                  }
                }}
              />
              <Label htmlFor="hasPhysicalDetails">
                This book doesn't have digitized copies or PDFs online
              </Label>
            </div>

            {hasPhysicalDetails && (
              <div className="mt-5">
                <PhysicalDetails form={form} disabled={isMutating} />
              </div>
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
