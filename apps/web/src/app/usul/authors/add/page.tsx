"use client";

import { useRouter } from "next/navigation";
import PageLayout from "@/components/page-layout";
import TextArrayInput from "@/components/text-array-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { textToSlug } from "@/lib/slug";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const schema = z.object({
  arabicName: z.string().min(1),
  englishName: z.string().optional(),
  transliteration: z.string().min(1),
  otherNames: z.array(z.string()),
  deathYear: z.number(),
  bio: z.string().optional(),
});

export default function AddAuthorPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      otherNames: [],
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
    await createAuthor({
      arabicName: data.arabicName,
      transliteration: data.transliteration,
      deathYear: data.deathYear,
      englishBio: data.bio,
      otherArabicNames: data.otherNames,
    });
  };

  const isMutating = isCreatingAuthor;

  return (
    <PageLayout title="Add Author" backHref="/usul/authors">
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
            name="englishName"
            disabled={isMutating}
            render={({ field }) => (
              <FormItem>
                <FormLabel>English Name</FormLabel>
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
            name="deathYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Death Year (Hijri)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
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

          <FormField
            control={form.control}
            name="otherNames"
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
              {isMutating ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </PageLayout>
  );
}
