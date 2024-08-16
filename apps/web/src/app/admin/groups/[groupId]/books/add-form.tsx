"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataCombobox from "@/components/data-combobox";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";
import toast from "react-hot-toast";

export default function AddBookForm({ groupId }: { groupId: string }) {
  const [selected, setSelected] = useState<Book | null>(null);
  const router = useRouter();
  const utils = api.useUtils();

  const { mutateAsync, isPending } = api.group.assignBook.useMutation({
    onSuccess: () => {
      toast.success("Book assigned to group");
      router.refresh();
      setSelected(null);
      utils.book.searchUnassignedBooks.reset();
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const handleSubmit = () => {
    if (!selected) return;
    mutateAsync({ bookId: selected.id, groupId });
  };

  return (
    <div className="mb-10 flex max-w-[300px] gap-2">
      <BooksCombobox selected={selected} onSelect={setSelected} />

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !selected}
      >
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}

type Book = inferRouterOutputs<
  typeof appRouter
>["book"]["searchUnassignedBooks"][number];

const POPOVER_WIDTH = "w-[250px]";

function BooksCombobox({
  selected,
  onSelect,
}: {
  selected: Book | null;
  onSelect: (book: Book | null) => void;
}) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const { data, isLoading, isError } = api.book.searchUnassignedBooks.useQuery({
    query: debouncedSearchQuery,
  });

  return (
    <DataCombobox
      data={data}
      isLoading={isLoading}
      isError={isError}
      onQueryChange={setDebouncedSearchQuery}
      selected={selected}
      onChange={onSelect}
      itemName="arabicName"
      messages={{
        placeholder: "Select book",
        loading: "Loading books...",
        empty: "No books found",
        error: "Something went wrong",
        search: "Search for a book",
      }}
    />
  );
}
