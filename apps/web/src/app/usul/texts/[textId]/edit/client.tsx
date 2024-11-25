"use client";

import type { AppRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdvancedGenresSelector from "@/components/advanced-genres-selector";
import { AuthorsCombobox } from "@/components/author-selector";
import LatestAuthorBooks from "@/components/latest-author-books";
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
import VersionsInput, { Version } from "@/components/versions-input";
import { useUploadPdfs } from "@/hooks/useUploadPdfs";
import { textToSlug } from "@/lib/slug";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

import CoverImage from "./cover-image";

const schema = z.object({
  arabicNames: z.array(z.string()).min(1),
  primaryArabicNameIndex: z.number().default(0),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  advancedGenres: z.array(z.string()),
  physicalDetails: physicalDetailsSchema,
  author: z.object({
    id: z.string(),
    slug: z.string(),
    arabicName: z.string(),
    transliteratedName: z.string().nullable(),
    year: z.coerce.number().optional(),
    yearStatus: z.nativeEnum(AuthorYearStatus).nullable(),
  }),
});

type Text = NonNullable<inferRouterOutputs<AppRouter>["usulBook"]["getById"]>;

export default function EditTextClientPage({ text }: { text: Text }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      author: text.author,
      arabicNames: [text.arabicName, ...(text.otherNames ?? [])],
      primaryArabicNameIndex: 0,
      transliteration: text.transliteratedName ?? "",
      advancedGenres: text.advancedGenres,
      otherNames: text.otherNames ?? [],
      physicalDetails: text.physicalDetails,
    },
  });

  const [versions, setVersions] = useState<Version[]>(() =>
    text.versions.map((v) => {
      if (v.source === "turath" || v.source === "openiti") {
        return {
          type: v.source as any,
          value: v.value,
          ...v.publicationDetails,
        };
      }

      return {
        type: v.source as any,
        url: v.value,
        ...(v.source === "pdf" ? { files: [], mode: "url" } : {}),
        ...v.publicationDetails,
      };
    }),
  );
  const { data: advancedGenres, isLoading: isLoadingAdvancedGenres } =
    api.usulAdvancedGenre.allAdvancedGenres.useQuery();

  const { isUploading, uploadFiles, uploadFromUrl } = useUploadPdfs();
  const [hasPhysicalDetails, setHasPhysicalDetails] = useState(
    !!text.physicalDetails,
  );

  const router = useRouter();

  const { mutateAsync: updateBook, isPending: isUpdatingBook } =
    api.usulBook.update.useMutation({
      onSuccess: () => {
        toast.success("Book updated successfully!");

        router.push("/usul/texts");
      },
    });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const inferredSlug = textToSlug(data.transliteration);

    const primaryArabicName = data.arabicNames[data.primaryArabicNameIndex]!;
    const otherNames = data.arabicNames.filter(
      (_, idx) => idx !== data.primaryArabicNameIndex,
    );

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

    await updateBook({
      id: text.id,
      arabicName: primaryArabicName,
      transliteratedName: data.transliteration,
      advancedGenres: data.advancedGenres,
      otherNames: otherNames,
      authorId: data.author.id,
      versions: finalVersions,
      physicalDetails: hasPhysicalDetails ? data.physicalDetails : null,
    });
  };

  const isMutating = isUploading || isUpdatingBook;

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
              <FormLabel>Author *</FormLabel>
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
                <div className="flex items-center gap-5">
                  <Link
                    href={`/usul/authors/${field.value.id}/edit`}
                    target="_blank"
                    className="my-1 block text-primary underline"
                  >
                    View on Internal tool
                  </Link>

                  <a
                    href={`https://usul.ai/author/${field.value.slug}`}
                    target="_blank"
                    className="my-1 block text-primary underline"
                  >
                    View on Usul
                  </a>
                </div>
              ) : null}
              <FormMessage />

              <LatestAuthorBooks authorSlug={field.value?.slug} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="arabicNames"
          disabled={isMutating}
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
                <FormLabel>Transliterated Name *</FormLabel>
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
              onCheckedChange={() => setHasPhysicalDetails(!hasPhysicalDetails)}
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

        {text.coverImageUrl ? (
          <CoverImage bookId={text.id} coverImageUrl={text.coverImageUrl} />
        ) : null}

        <div className="my-10 h-[2px] w-full bg-border" />

        <div>
          <Button type="submit" disabled={isMutating}>
            {isUploading
              ? "Uploading files..."
              : isUpdatingBook
                ? "Submitting..."
                : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
