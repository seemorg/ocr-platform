import { cn } from "@/lib/utils";

export const Container = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6", className)}
      {...props}
    >
      {children}
    </div>
  );
};
