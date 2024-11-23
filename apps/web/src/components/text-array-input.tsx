import { useMemo } from "react";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { XIcon } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function TextArrayInput({
  values,
  setValues,
  disabled,
  primaryIndex,
  setPrimaryIndex,
}: {
  values: string[];
  setValues: (values: string[]) => void;
  primaryIndex?: number;
  setPrimaryIndex?: (index: number) => void;
  disabled?: boolean;
}) {
  const sortedByPrimaryIndex = useMemo(() => {
    const formattedValues = values.map((_, idx) => ({ value: _, idx }));

    if (primaryIndex === undefined) return formattedValues;

    return formattedValues.sort((a, b) =>
      a.idx === primaryIndex ? -1 : b.idx === primaryIndex ? 1 : 0,
    );
  }, [values, primaryIndex]);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {sortedByPrimaryIndex.map((item) => (
          <div key={item.idx} className="flex items-center gap-2">
            <Input
              value={item.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newNames = [...values];
                newNames[item.idx] = e.target.value;
                setValues(newNames);
              }}
              className="w-full"
              disabled={disabled}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-yellow-400 hover:text-yellow-500"
              onClick={() => setPrimaryIndex?.(item.idx)}
              disabled={disabled}
            >
              {primaryIndex === item.idx ? (
                <StarFilledIcon className="size-5" />
              ) : (
                <StarIcon className="size-5" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const newNames = [...values];
                newNames.splice(item.idx, 1);
                setValues(newNames);
                // adjust primary index
                if (primaryIndex === item.idx) {
                  setPrimaryIndex?.(Math.max(item.idx - 1, 0));
                } else if (
                  primaryIndex !== undefined &&
                  primaryIndex > item.idx
                ) {
                  setPrimaryIndex?.(Math.max(primaryIndex - 1, 0));
                }
              }}
              disabled={disabled}
            >
              <XIcon className="size-5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setValues([...values, ""])}
        className="mt-4"
        disabled={disabled}
      >
        Add
      </Button>
    </div>
  );
}
