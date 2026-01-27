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

  // Fetch parent genre if it exists
  let parentGenre = null;
  if (genre.parentGenre) {
    const parent = await usulDb.advancedGenre.findUnique({
      where: {
        id: genre.parentGenre,
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

    if (parent) {
      const parentNames = parent.nameTranslations.reduce(
        (acc, translation) => {
          acc[translation.locale] = translation.text;
          return acc;
        },
        {} as Record<string, string>,
      );

      parentGenre = {
        id: parent.id,
        slug: parent.slug,
        arabicName: parentNames.ar ?? null,
        englishName: parentNames.en ?? null,
        transliteratedName: parent.transliteration,
      };
    }
  }

  return (
    <PageLayout title="Edit Genre" backHref="/usul/genres">
      <EditGenreClientPage
        genre={{
          id: genre.id,
          arabicName: names.ar,
          englishName: names.en,
          slug: genre.slug,
          transliteration: genre.transliteration ?? undefined,
          parentGenre: parentGenre ?? undefined,
        }}
      />
    </PageLayout>
  );
}
