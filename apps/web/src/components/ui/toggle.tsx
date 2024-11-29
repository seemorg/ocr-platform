import { cn } from "@/lib/utils";

const Toggle = ({
  value,
  onChange,
  renderLabel,
  disabled,
}: {
  value: boolean;
  onChange: (newValue: boolean) => void;
  renderLabel: (v: boolean) => string;
  disabled?: boolean;
}) => {
  return (
    <div className="flex items-center">
      {new Array(2).fill(null).map((_, idx) => (
        <button
          key={idx}
          type="button"
          className={cn(
            "w-full px-3 py-2 text-xs font-medium disabled:opacity-50",
            value === (idx === 0)
              ? "rounded-full bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
          onClick={() => onChange(idx === 0)}
          disabled={disabled}
        >
          {renderLabel(idx === 0)}
        </button>
      ))}
    </div>
  );
};

export default Toggle;
