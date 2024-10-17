"use client";

import type { PaginationState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/lib/pagination.client";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  OnChangeFn,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalItems: number;
  // pagination: {
  //   pageIndex: number;
  //   pageSize: number;
  // };
}

export function DefaultDataTable<TData, TValue>({
  columns,
  data,
  // pagination,
  totalItems,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const { currentPage, pageSize, setCurrentPage, setPageSize, isPending } =
    usePagination();

  const paginationState = useMemo(
    () => ({
      pageIndex: currentPage - 1,
      pageSize: pageSize,
    }),
    [currentPage, pageSize],
  );

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater: any) => {
      const newState = updater(paginationState) as PaginationState;
      setCurrentPage(newState.pageIndex + 1);
      setPageSize(newState.pageSize);
    },
    [paginationState, setCurrentPage, setPageSize],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    // getPaginationRowModel: getPaginationRowModel(),
    rowCount: totalItems,
    state: {
      columnVisibility,
      columnFilters,
      pagination: paginationState,
    },
    onPaginationChange,
    manualPagination: true,
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="py-4">
        <DataTablePagination table={table} isPending={isPending} />
      </div>
    </div>
  );
}
