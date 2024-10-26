"use client";

import type { AppRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TextArrayInput from "@/components/text-array-input";
import TransliterationHelper from "@/components/transliteration-helper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { AuthorYearStatus } from "@usul-ocr/usul-db";

const schema = z.object({
  arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  otherArabicNames: z.array(z.string()),
  arabicBio: z.string().optional(),
  deathYear: z.coerce.number().optional(),
  yearStatus: z.nativeEnum(AuthorYearStatus).optional(),
});

type Author = NonNullable<
  inferRouterOutputs<AppRouter>["usulAuthor"]["getById"]
>;

export default function EditTextClientPage({ author }: { author: Author }) {
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      deathYear: author.year ?? undefined,
      yearStatus: author.yearStatus ?? undefined,
      arabicName: author.arabicName,
      transliteration: author.transliteratedName ?? "",
      otherArabicNames: author.otherArabicNames ?? [],
      arabicBio: author.arabicBio,
    },
  });

  const { mutateAsync: updateAuthor, isPending: isUpdatingAuthor } =
    api.usulAuthor.update.useMutation({
      onSuccess: () => {
        toast.success("Author updated successfully!");
        router.push("/usul/authors");
      },
    });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!data.yearStatus && !data.deathYear) {
      toast.error("Year status or death year is required");
      return;
    }

    await updateAuthor({
      id: author.id,
      arabicName: data.arabicName,
      transliteration: data.transliteration,
      deathYear: data.yearStatus ? undefined : data.deathYear,
      yearStatus: data.yearStatus,
      arabicBio: data.arabicBio,
      otherArabicNames: data.otherArabicNames,
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
        <FormField
          control={form.control}
          name="arabicName"
          disabled={isMutating}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Arabic Name *</FormLabel>
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
                <FormLabel>Transliterated Name *</FormLabel>
                <TransliterationHelper
                  getText={() => form.watch("arabicName")}
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

        <FormField
          control={form.control}
          name="otherArabicNames"
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

        <div>
          <Button type="submit" disabled={isMutating}>
            {isMutating ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
