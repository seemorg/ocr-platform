import { api } from "@/trpc/react";

export default function useAirtableTexts() {
  const utils = api.useUtils();
  const { data: airtableTexts, isLoading: isLoadingAirtableTexts } =
    api.airtable.getAirtableTexts.useQuery();

  const {
    mutateAsync: invalidateAirtableTexts,
    isPending: isInvalidatingAirtableTexts,
  } = api.airtable.invalidateAirtableTexts.useMutation({
    onSuccess: () => {
      utils.airtable.getAirtableTexts.reset();
    },
  });

  return {
    airtableTexts,
    isLoadingAirtableTexts,
    purgeCache: invalidateAirtableTexts,
    isPurgingCache: isInvalidatingAirtableTexts,
  };
}
