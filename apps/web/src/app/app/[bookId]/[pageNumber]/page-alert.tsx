import type { ComponentProps } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";

export const PageAlert = ({
  icon: Icon,
  variant,
  children,
}: {
  icon: React.ElementType;
  variant?: ComponentProps<typeof Alert>["variant"];
  children: React.ReactNode;
}) => {
  return (
    <Alert className="[&>svg+div]:translate-y-0" variant={variant}>
      <Icon className="!top-3 size-4" />
      <AlertTitle className="mb-0">{children}</AlertTitle>
    </Alert>
  );
};
