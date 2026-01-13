"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { textToSlug } from "@/lib/slug";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";

export default function AddEmpireForm() {
  const [arabicName, setArabicName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [slug, setSlug] = useState("");

  const router = useRouter();
  const { mutateAsync, isPending } = api.usulEmpire.create.useMutation({
    onSuccess: () => {
      toast.success("Empire created");
      router.refresh();
      setArabicName("");
      setEnglishName("");
      setSlug("");
      setTransliteration("");
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
      arabicName: preparedArabicName,
      englishName: preparedEnglishName,
      transliteration: preparedTransliteration,
      slug,
    });
  };

  return (
    <PageLayout title="Add Empire & Era" backHref="/usul/empires">
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
            required
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
            {isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
