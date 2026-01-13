import { formatDate } from "@/lib/date";
import { AlertCircle, CheckCircle } from "lucide-react";

import { PageFlag, PageOcrStatus } from "@usul-ocr/db";

import { PageAlert } from "./page-alert";

export default function Alerts({
  page,
}: {
  page: {
    reviewed: boolean;
    User?: { email?: string | null } | null;
    reviewedAt: Date | null;
    flags: PageFlag[];
    ocrStatus: PageOcrStatus;
  };
}) {
  return (
    <>
      {page.reviewed ? (
        <PageAlert icon={CheckCircle} variant="success">
          This page has been submitted by {page.User?.email} at{" "}
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
        <PageAlert icon={AlertCircle} variant="info">
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
