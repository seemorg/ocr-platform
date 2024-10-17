import { useTransition } from "react";
import { parseAsInteger, useQueryState } from "nuqs";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./pagination";

export function usePagination() {
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger
      .withDefault(DEFAULT_PAGE)
      .withOptions({ shallow: false, clearOnDefault: true, startTransition }),
  );
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger
      .withDefault(DEFAULT_PAGE_SIZE)
      .withOptions({ shallow: false, clearOnDefault: true, startTransition }),
  );

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    isPending,
  };
}
