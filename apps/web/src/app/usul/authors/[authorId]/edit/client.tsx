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

const schema = z.object({
  arabicName: z.string().min(1),
  transliteration: z.string().min(1),
  otherArabicNames: z.array(z.string()),
  arabicBio: z.string().optional(),
  deathYear: z.coerce.number(),
});

type Author = NonNullable<
  inferRouterOutputs<AppRouter>["usulAuthor"]["getById"]
>;

export default function EditTextClientPage({ author }: { author: Author }) {
  const router = useRouter();
  const [authorAlive, setAuthorAlive] = useState(author.year === -1);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      deathYear: author.year,
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
    await updateAuthor({
      id: author.id,
      arabicName: data.arabicName,
      transliteration: data.transliteration,
      deathYear: authorAlive ? -1 : data.deathYear,
      arabicBio: data.arabicBio,
      otherArabicNames: data.otherArabicNames,
    });
  };

  const isMutating = isUpdatingAuthor;

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
          name="deathYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Death Year (Hijri) *</FormLabel>

              <div className="mt-2 flex gap-2">
                <Checkbox
                  id="authorAlive"
                  checked={authorAlive}
                  onCheckedChange={() => setAuthorAlive(!authorAlive)}
                  disabled={isMutating}
                />
                <Label htmlFor="authorAlive">Author is alive</Label>
              </div>

              {!authorAlive && (
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
