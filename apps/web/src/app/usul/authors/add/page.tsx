"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import Toggle from "@/components/ui/toggle";
import {
  gregorianYearToHijriYear,
  hijriYearToGregorianYear,
} from "@/lib/hijri";
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
  deathYear: z.coerce.number().optional(),
  yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
  arabicBio: z.string().optional(),
});

export default function AddAuthorPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      arabicNames: [""],
      primaryArabicNameIndex: 0,
      otherArabicNames: [],
    },
  });

  const router = useRouter();

  const { mutateAsync: createAuthor, isPending: isCreatingAuthor } =
    api.usulAuthor.create.useMutation({
      onSuccess: () => {
        toast.success("Author created successfully!");
        router.push("/usul/authors");
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

    await createAuthor({
      arabicName: primaryArabicName,
      transliteration: data.transliteration,
      deathYear: data.yearStatus ? undefined : data.deathYear,
      yearStatus: data.yearStatus,
      arabicBio: data.arabicBio,
      otherArabicNames: otherNames,
    });
  };

  const isMutating = isCreatingAuthor;

  const setAuthorYearStatus = (checked: boolean, status: AuthorYearStatus) => {
    if (checked) {
      form.setValue("yearStatus", status);
      form.setValue("deathYear", undefined);
    } else {
      form.setValue("yearStatus", undefined);
      form.setValue("deathYear", undefined);
    }
  };

  const currentYearStatus = form.watch("yearStatus");

  const [isGregorianMode, setIsGregorianMode] = useState(false);

  const convertHijriToGregorian = () => {
    const hijriYear = form.watch("deathYear");
    if (!hijriYear) {
      toast.error("Please enter a Hijri year first");
      return;
    }
    const gregorianYear = hijriYearToGregorianYear(hijriYear);
    form.setValue("deathYear", gregorianYear);
    setIsGregorianMode(true);
  };

  const convertGregorianToHijri = () => {
    const gregorianYear = form.watch("deathYear");
    if (!gregorianYear) {
      toast.error("Please enter a Gregorian year first");
      return;
    }
    const hijriYear = gregorianYearToHijriYear(gregorianYear + 1);
    form.setValue("deathYear", hijriYear);
    setIsGregorianMode(false);
  };

  return (
    <PageLayout title="Add Author" backHref="/usul/authors">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
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
                  <>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isMutating}
                        type="number"
                        placeholder={
                          isGregorianMode ? "Gregorian Year" : "Hijri Year"
                        }
                      />
                    </FormControl>

                    <div className="mt-2 flex gap-2">
                      <Toggle
                        value={isGregorianMode}
                        onChange={(v) =>
                          v
                            ? convertHijriToGregorian()
                            : convertGregorianToHijri()
                        }
                        renderLabel={(v) => (v ? "Gregorian" : "Hijri")}
                        disabled={isMutating}
                      />
                    </div>
                  </>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

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

          <div>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </PageLayout>
  );
}
