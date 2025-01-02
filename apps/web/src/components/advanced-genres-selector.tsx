import { useCallback, useMemo } from "react";
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
  const advancedGenresMap = useMemo(() => {
    const map = (advancedGenres ?? []).reduce(
      (acc, genre) => {
        acc[genre.id] = genre.name;
        return acc;
      },
      {} as Record<string, string>,
    );

    return map;
  }, [advancedGenres]);

  const renderLabel = useCallback(
    (id: string) => {
      return advancedGenresMap[id] ?? id;
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
          onPaste={(event) => {
            event.preventDefault();

            const text = event.clipboardData.getData("text");
            const names = text.split(",").map((it) => it.trim());
            const genreIds = advancedGenres?.reduce((ids, { name, id }) => {
              if (names.includes(name)) {
                ids.push(id);
              }
              return ids;
            }, [] as string[]);

            if (genreIds)
              setSelectedAdvancedGenreIds(
                Array.from(new Set(selectedAdvancedGenreIds.concat(genreIds))),
              );
          }}
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
