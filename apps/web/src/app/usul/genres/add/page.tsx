"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataCombobox from "@/components/data-combobox";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { textToSlug } from "@/lib/slug";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";

type AdvancedGenre =
  inferRouterOutputs<AppRouter>["usulAdvancedGenre"]["searchAdvancedGenres"][number];

export default function AddAdvancedGenreForm() {
  const [arabicName, setArabicName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [slug, setSlug] = useState("");
  const [parentGenreSearchQuery, setParentGenreSearchQuery] = useState("");
  const [selectedParentGenre, setSelectedParentGenre] =
    useState<AdvancedGenre | null>(null);

  const router = useRouter();
  const {
    data: parentGenres,
    isLoading: isLoadingParentGenres,
    isError: isErrorParentGenres,
  } = api.usulAdvancedGenre.searchAdvancedGenres.useQuery({
    query: parentGenreSearchQuery || undefined,
  });
  const { mutateAsync, isPending } = api.usulAdvancedGenre.create.useMutation({
    onSuccess: () => {
      toast.success("Genre created");
      router.refresh();
      setArabicName("");
      setEnglishName("");
      setSlug("");
      setTransliteration("");
      setSelectedParentGenre(null);
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
      parentGenre: selectedParentGenre?.id || undefined,
    });
  };

  return (
    <PageLayout title="Add Genre" backHref="/usul/genres">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="max-w-xl">
          <Label>Arabic Name</Label>
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
          <Label>English Name</Label>
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
          <Label>Transliteration</Label>
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
          <Label>Slug</Label>
          <Input
            type="text"
            value={slug}
            placeholder="Slug"
            onChange={(e) => setSlug(e.target.value)}
            disabled={isPending}
            required
          />
        </div>

        <div className="max-w-xl">
          <Label>Parent Genre</Label>
          <DataCombobox<AdvancedGenre>
            data={parentGenres}
            isLoading={isLoadingParentGenres}
            isError={isErrorParentGenres}
            onQueryChange={setParentGenreSearchQuery}
            selected={selectedParentGenre}
            onChange={setSelectedParentGenre}
            itemName={(item) =>
              item.arabicName ?? item.englishName ?? item.transliteratedName ?? ""
            }
            messages={{
              placeholder: "Select parent genre (optional)",
              search: "Search genres...",
              empty: "No genres found",
            }}
            widthClassName="w-full max-w-xl"
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
