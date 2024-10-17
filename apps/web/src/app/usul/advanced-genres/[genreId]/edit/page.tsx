import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { usulDb } from "@/server/db";

import EditGenreClientPage from "./client";

export default async function EditGenrePage({
  params,
}: {
  params: {
    genreId: string;
  };
}) {
  const genre = await usulDb.advancedGenre.findUnique({
    where: {
      id: params.genreId,
    },
    include: {
      nameTranslations: {
        where: {
          locale: {
            in: ["ar", "en"],
          },
        },
      },
    },
  });

  if (!genre) {
    notFound();
  }

  const names = genre.nameTranslations.reduce(
    (acc, translation) => {
      acc[translation.locale] = translation.text;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <PageLayout title="Edit Advanced Genre" backHref="/usul/advanced-genres">
      <EditGenreClientPage
        genre={{
          id: genre.id,
          arabicName: names.ar,
          englishName: names.en,
          slug: genre.slug,
          transliteration: genre.transliteration ?? undefined,
        }}
      />
    </PageLayout>
  );
}
