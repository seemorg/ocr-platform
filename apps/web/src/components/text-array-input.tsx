import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function TextArrayInput({
  values,
  setValues,
  disabled,
}: {
  values: string[];
  setValues: (values: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      {values.map((name, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newNames = [...values];
              newNames[idx] = e.target.value;
              setValues(newNames);
            }}
            className="w-full"
            disabled={disabled}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              const newNames = [...values];
              newNames.splice(idx, 1);
              setValues(newNames);
            }}
            disabled={disabled}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={() => setValues([...values, ""])}
        className={cn(values.length > 0 ? "mt-4" : "")}
        disabled={disabled}
      >
        Add
      </Button>
    </div>
  );
}
