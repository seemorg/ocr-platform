import { notFound } from "next/navigation";
import PageLayout from "@/components/page-layout";
import { usulDb } from "@/server/db";

import EditEmpireClientPage from "./client";

export default async function EditEmpirePage({
  params,
}: {
  params: {
    empireId: string;
  };
}) {
  const empire = await usulDb.empire.findUnique({
    where: {
      id: params.empireId,
    },
    include: {
      EmpireName: {
        where: {
          locale: {
            in: ["ar", "en"],
          },
        },
      },
    },
  });

  if (!empire) {
    notFound();
  }

  const names = empire.EmpireName.reduce(
    (acc, name) => {
      acc[name.locale] = name.text;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <PageLayout title="Edit Empire" backHref="/usul/empires">
      <EditEmpireClientPage
        empire={{
          id: empire.id,
          arabicName: names.ar,
          englishName: names.en,
          slug: empire.slug,
          transliteration: empire.transliteration ?? undefined,
        }}
      />
    </PageLayout>
  );
}
