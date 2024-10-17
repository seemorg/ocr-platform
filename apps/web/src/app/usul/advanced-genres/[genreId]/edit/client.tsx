"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { textToSlug } from "@/lib/slug";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";

export default function EditGenrePage({
  genre,
}: {
  genre: {
    id: string;
    arabicName?: string;
    englishName?: string;
    transliteration?: string;
    slug: string;
  };
}) {
  const [arabicName, setArabicName] = useState(genre.arabicName ?? "");
  const [englishName, setEnglishName] = useState(genre.englishName ?? "");
  const [transliteration, setTransliteration] = useState(
    genre.transliteration ?? "",
  );
  const [slug, setSlug] = useState(genre.slug);

  const router = useRouter();
  const { mutateAsync, isPending } = api.usulAdvancedGenre.update.useMutation({
    onSuccess: () => {
      toast.success("Advanced Genre updated");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const preparedArabicName = arabicName.trim();
    const preparedEnglishName = englishName.trim();
    const preparedTransliteration = transliteration.trim();

    if (!preparedArabicName || !preparedEnglishName || !slug) return;

    mutateAsync({
      id: genre.id,
      arabicName: preparedArabicName,
      englishName: preparedEnglishName,
      transliteration: preparedTransliteration,
      slug,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="max-w-xl">
        <Input
          type="text"
          value={arabicName}
          placeholder="Arabic Name"
          onChange={(e) => setArabicName(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="max-w-xl">
        <Input
          type="text"
          value={englishName}
          placeholder="English Name"
          onChange={(e) => {
            const name = e.target.value;
            setEnglishName(name);
            setSlug(textToSlug(name));
          }}
          disabled={isPending}
          required
        />
      </div>

      <div className="max-w-xl">
        <Input
          type="text"
          value={transliteration}
          placeholder="Transliteration"
          onChange={(e) => setTransliteration(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="max-w-xl">
        <Input
          type="text"
          value={slug}
          placeholder="Slug"
          onChange={(e) => setSlug(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating..." : "Update"}
        </Button>
      </div>
    </form>
  );
}
