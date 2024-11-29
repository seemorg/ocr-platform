"use client";

import type { AppRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LatestAuthorBooks from "@/components/latest-author-books";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

const schema = z.object({
  arabicNames: z.array(z.string()).min(1),
  primaryArabicNameIndex: z.number().default(0),
  transliteration: z.string().min(1),
  otherArabicNames: z.array(z.string()),
  arabicBio: z.string().optional(),
  englishBio: z.string().optional(),
  deathYear: z.coerce.number().optional(),
  yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
});

type Author = NonNullable<
  inferRouterOutputs<AppRouter>["usulAuthor"]["getById"]
>;

export default function EditTextClientPage({ author }: { author: Author }) {
  const router = useRouter();

  const [bioMode, setBioMode] = useState<"ar" | "en">("ar");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      deathYear: author.year ?? undefined,
      yearStatus: author.yearStatus ?? undefined,
      arabicNames: [author.arabicName, ...(author.otherArabicNames ?? [])],
      primaryArabicNameIndex: 0,
      transliteration: author.transliteratedName ?? "",
      otherArabicNames: author.otherArabicNames ?? [],
      arabicBio: author.arabicBio,
      englishBio: author.englishBio,
    },
  });

  const { mutateAsync: updateAuthor, isPending: isUpdatingAuthor } =
    api.usulAuthor.update.useMutation({
      onSuccess: () => {
        toast.success("Author updated successfully!");
        router.push("/usul/authors");
      },
      onError: () => {
        toast.error("Failed to update author");
      },
    });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!data.yearStatus && !data.deathYear) {
      toast.error("Year status or death year is required");
      return;
    }

    const primaryArabicName = data.arabicNames[data.primaryArabicNameIndex]!;
    const otherNames = data.arabicNames.filter(
      (_, idx) => idx !== data.primaryArabicNameIndex,
    );

    // if changes were made to both bios, throw an error
    if (
      data.arabicBio !== author.arabicBio &&
      data.englishBio !== author.englishBio
    ) {
      toast.error(
        "Cannot change both Arabic and English bios, reset one of them first",
      );
      return;
    }

    // only send select bio mode + only send it if it changed
    let bioToSend: { arabicBio?: string } | { englishBio?: string } | null =
      null;
    if (bioMode === "ar" && data.arabicBio !== author.arabicBio) {
      bioToSend = { arabicBio: data.arabicBio };
    } else if (bioMode === "en" && data.englishBio !== author.englishBio) {
      bioToSend = { englishBio: data.englishBio };
    }

    await updateAuthor({
      id: author.id,
      arabicName: primaryArabicName,
      transliteration: data.transliteration,
      deathYear: data.yearStatus ? undefined : data.deathYear,
      yearStatus: data.yearStatus,
      otherArabicNames: otherNames,
      ...(bioToSend ?? {}),
    });
  };

  const isMutating = isUpdatingAuthor;

  const setAuthorYearStatus = (checked: boolean, status: AuthorYearStatus) => {
    if (checked) {
      form.setValue("yearStatus", status);
      form.setValue("deathYear", undefined);
    } else {
      form.setValue("yearStatus", undefined);
      form.setValue("deathYear", author.year ?? undefined);
    }
  };

  const currentYearStatus = form.watch("yearStatus");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-10"
      >
        <LatestAuthorBooks authorSlug={author.slug} />

        <FormField
          control={form.control}
          name="arabicNames"
          disabled={isMutating}
          render={({ field }) => (
            <FormItem>
              <div>
                <FormLabel>Author Names (Arabic) *</FormLabel>
                <FormDescription>
                  Add all names that this author is known by
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
          name="deathYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Death Year (Hijri) *</FormLabel>

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
                    disabled={isMutating}
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
                    disabled={isMutating}
                  />
                  <Label htmlFor="authorUnknown">
                    Author's death year is unknown
                  </Label>
                </div>
              </div>

              {!currentYearStatus && (
                <FormControl>
                  <Input {...field} disabled={isMutating} type="number" />
                </FormControl>
              )}

              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs
          value={bioMode}
          onValueChange={(value) => setBioMode(value as "ar" | "en")}
        >
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="ar">Arabic</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>
            <p className="text-xs text-gray-500">
              Only update one language, the other gets automatically updated
            </p>
          </div>
          <TabsContent value="ar">
            <FormField
              control={form.control}
              name="arabicBio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biography (Arabic)</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-40" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              size="sm"
              disabled={isMutating}
              onClick={() => form.setValue("arabicBio", author.arabicBio)}
            >
              Reset to original
            </Button>
          </TabsContent>
          <TabsContent value="en">
            <FormField
              control={form.control}
              name="englishBio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biography (English)</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-40" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              className="mt-2"
              size="sm"
              disabled={isMutating}
              onClick={() => form.setValue("englishBio", author.englishBio)}
            >
              Reset to original
            </Button>
          </TabsContent>
        </Tabs>

        <div>
          <Button type="submit" disabled={isMutating}>
            {isMutating ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
