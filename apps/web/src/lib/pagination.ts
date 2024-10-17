import type { PaginationSearchParams } from "@/types/pagination";

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;

export function getPagination(searchParams: PaginationSearchParams) {
  const page = searchParams.page ? Number(searchParams.page) : DEFAULT_PAGE;
  const pageSize = searchParams.pageSize
    ? Number(searchParams.pageSize)
    : DEFAULT_PAGE_SIZE;

  return {
    page: isNaN(page) ? DEFAULT_PAGE : page,
    pageSize: isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize,
  };
}
