import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { usulDb } from "@/server/db";

import EditRegionClientPage from "./client";

export default async function EditRegionPage({
  params,
}: {
  params: {
    regionId: string;
  };
}) {
  const region = await usulDb.region.findUnique({
    where: {
      id: params.regionId,
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

  if (!region) {
    notFound();
  }

  const names = region.nameTranslations.reduce(
    (acc, name) => {
      acc[name.locale] = name.text;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <PageLayout title="Edit Region" backHref="/usul/regions">
      <EditRegionClientPage
        region={{
          id: region.id,
          arabicName: names.ar,
          englishName: names.en,
          slug: region.slug,
          transliteration: region.transliteration ?? undefined,
        }}
      />
    </PageLayout>
  );
}
