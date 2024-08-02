import { ComponentProps } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/date";
import { AlertCircle, CheckCircle } from "lucide-react";

import { PageFlag, PageOcrStatus } from "@usul-ocr/db";

const PageAlert = ({
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

export default function Alerts({
  page,
}: {
  page: {
    reviewed: boolean;
    reviewedBy?: { email?: string | null } | null;
    reviewedAt: Date | null;
    flags: PageFlag[];
    ocrStatus: PageOcrStatus;
  };
}) {
  return (
    <>
      {page.reviewed ? (
        <PageAlert icon={CheckCircle} variant="success">
          This page has been submitted by {page.reviewedBy?.email} at{" "}
          {page.reviewedAt ? formatDate(page.reviewedAt) : null}. You can still
          edit it and override the submission
        </PageAlert>
      ) : page.flags.includes(PageFlag.NEEDS_ADDITIONAL_REVIEW) ? (
        <PageAlert icon={AlertCircle} variant="warning">
          This page is more likely to contain mistakes and needs additional time
          to review
        </PageAlert>
      ) : null}

      {page.ocrStatus === PageOcrStatus.PROCESSING && (
        <PageAlert icon={AlertCircle} variant="warning">
          This page is being regenerated. Please refresh to see if it's ready.
          When it's ready this message will no longer appear.
        </PageAlert>
      )}

      {page.ocrStatus === PageOcrStatus.FAILED && (
        <PageAlert icon={AlertCircle} variant="warning">
          AI is not able to generate this page, you have to type it manually
        </PageAlert>
      )}
    </>
  );
}
