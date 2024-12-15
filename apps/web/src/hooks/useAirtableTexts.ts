import { useState } from "react";
import { airtableBases } from "@/lib/airtable/bases";
import { api } from "@/trpc/react";

export default function useAirtableTexts() {
  const utils = api.useUtils();
  const [base, setBase] = useState<(typeof airtableBases)[number]>("texts");
  const [selectedAirtableIndex, setSelectedAirtableIndex] = useState<
    number | null
  >(null);

  const { data: airtableTexts, isLoading: isLoadingAirtableTexts } =
    api.airtable.getAirtableTexts.useQuery({ base });

  const {
    mutateAsync: invalidateAirtableTexts,
    isPending: isInvalidatingAirtableTexts,
  } = api.airtable.invalidateAirtableTexts.useMutation({
    onSuccess: () => {
      utils.airtable.getAirtableTexts.reset();
    },
  });

  const handleBaseChange = (value: (typeof airtableBases)[number]) => {
    if (value === base) return;

    setBase(value);
    setSelectedAirtableIndex(0);
  };

  return {
    airtableTexts,
    setBase: handleBaseChange,
    base,
    isLoadingAirtableTexts,
    selectedAirtableIndex,
    setSelectedAirtableIndex,
    purgeCache: invalidateAirtableTexts,
    isPurgingCache: isInvalidatingAirtableTexts,
  };
}
