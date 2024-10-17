import { useCallback } from "react";
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from "@/components/ui/multiselect";

export default function AdvancedGenresSelector({
  selectedAdvancedGenreIds,
  setSelectedAdvancedGenreIds,
  isLoading,
  advancedGenres,
}: {
  selectedAdvancedGenreIds: string[];
  setSelectedAdvancedGenreIds: (genreIds: string[]) => void;
  isLoading?: boolean;
  advancedGenres?: {
    id: string;
    name: string;
  }[];
}) {
  const renderLabel = useCallback(
    (id: string) => {
      const map = (advancedGenres ?? []).reduce(
        (acc, genre) => {
          acc[genre.id] = genre.name;
          return acc;
        },
        {} as Record<string, string>,
      );

      return map[id] ?? id;
    },
    [advancedGenres],
  );

  return (
    <MultiSelector
      values={selectedAdvancedGenreIds}
      onValuesChange={setSelectedAdvancedGenreIds}
      loop
    >
      <MultiSelectorTrigger renderLabel={renderLabel}>
        <MultiSelectorInput
          placeholder={isLoading ? "Loading..." : "Select advanced genres"}
          disabled={isLoading}
        />
      </MultiSelectorTrigger>

      <MultiSelectorContent>
        {advancedGenres ? (
          <MultiSelectorList>
            {advancedGenres.map((advancedGenre) => (
              <MultiSelectorItem
                key={advancedGenre.id}
                value={advancedGenre.id}
              >
                {advancedGenre.name}
              </MultiSelectorItem>
            ))}
          </MultiSelectorList>
        ) : (
          <div>Loading...</div>
        )}
      </MultiSelectorContent>
    </MultiSelector>
  );
}
