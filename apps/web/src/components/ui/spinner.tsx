import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const variants = cva("animate-spin", {
  variants: {
    size: {
      "2xs": "h-4 w-4",
      xs: "h-5 w-5",
      sm: "h-7 w-7",
      md: "h-10 w-10",
      lg: "h-14 w-14",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type SpinnerProps = React.SVGAttributes<SVGElement> &
  VariantProps<typeof variants>;

export default function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <svg
      className={cn(variants({ size }), className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
