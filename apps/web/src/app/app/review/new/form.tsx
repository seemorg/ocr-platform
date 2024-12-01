"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataCombobox from "@/components/data-combobox";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api, RouterOutputs } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import GroupsCombobox from "./group-selector";

const schema = z.object({
  groupId: z.string().optional(),
});

type Book = RouterOutputs["usulBook"]["search"][number];
function BooksCombobox({
  selected,
  onSelect,
}: {
  selected: Book | null;
  onSelect: (book: Book | null) => void;
}) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { data, isLoading, isError } = api.usulBook.search.useQuery({
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

export default function NewBookForm() {
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    name: string;
    createdAt: Date;
  } | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  const router = useRouter();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<
    Book["versions"][number] | null
  >(null);

  const { mutateAsync, isPending } = api.book.create.useMutation({
    onSuccess: () => {
      toast.success("Book created successfully");
      router.push("/app/review");
      router.refresh();
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        toast.error("Book already exists!");
      } else {
        toast.error("Something went wrong!");
      }
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof schema>) {
    if (!selectedVersion || !selectedBook || selectedVersion.source !== "pdf")
      return;

    if (selectedVersion.ocrBookId) {
      toast.error("Book already has an OCR book id");
      return;
    }

    mutateAsync({
      usulBookId: selectedBook.id,
      arabicName: selectedBook.arabicName,
      englishName: selectedBook.englishName,
      pdfUrl: selectedVersion.value,
      groupId: values.groupId,
    });
  }

  const isLoading = isPending;
  const bookVersions = selectedBook
    ? selectedBook.versions.filter((version) => version.source === "pdf")
    : [];

  return (
    <div className="mt-20">
      <BooksCombobox selected={selectedBook} onSelect={setSelectedBook} />

      {selectedBook ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-20 flex flex-col gap-10"
          >
            <div className="flex flex-col gap-10">
              <div className="w-full">
                <Label>Arabic Name</Label>
                <Input
                  value={selectedBook?.arabicName}
                  className="mt-2"
                  disabled
                />
              </div>

              <div className="w-full">
                <Label>English Name</Label>
                <Input
                  value={selectedBook?.englishName}
                  className="mt-2"
                  disabled
                />
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://usul.ai/t/${selectedBook.slug}`}
                  target="_blank"
                  className="text-primary underline"
                >
                  View on usul
                </a>

                <a
                  href={`/usul/texts/${selectedBook.id}/edit`}
                  target="_blank"
                  className="text-primary underline"
                >
                  View on internal tool
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-10 sm:flex-row">
              <div className="w-full">
                <Label>Versions</Label>
                <div className="mt-2 flex flex-col gap-3">
                  {bookVersions.map((version) => (
                    <div
                      key={version.value}
                      className={cn(
                        "relative rounded-lg border-2 p-4 hover:bg-gray-100",
                        selectedVersion?.value === version.value
                          ? "border-primary bg-primary/10"
                          : "border-gray-200",
                        version.ocrBookId
                          ? "cursor-not-allowed opacity-50"
                          : "",
                      )}
                      onClick={() => {
                        if (version.ocrBookId) return;
                        setSelectedVersion(version);
                      }}
                    >
                      {version.ocrBookId && (
                        <div className="absolute right-2 top-2 rounded-md bg-primary px-2 py-1 text-xs text-white">
                          Added to OCR
                        </div>
                      )}

                      <div>
                        <p>Pdf URL</p>
                        <a
                          href={version.value}
                          target="_blank"
                          className="mt-2 truncate text-primary underline"
                        >
                          {version.value}
                        </a>
                      </div>

                      <div className="mt-10 grid grid-cols-2 gap-5">
                        <div>
                          <p>Investigator</p>
                          <p className="mt-2">
                            {version.publicationDetails?.investigator ?? "-"}
                          </p>
                        </div>

                        <div>
                          <p>Publisher</p>
                          <p className="mt-2">
                            {version.publicationDetails?.publisher ?? "-"}
                          </p>
                        </div>

                        <div>
                          <p>Edition Number</p>
                          <p className="mt-2">
                            {version.publicationDetails?.editionNumber ?? "-"}
                          </p>
                        </div>

                        <div>
                          <p>Publication Year</p>
                          <p className="mt-2">
                            {version.publicationDetails?.publicationYear ?? "-"}
                          </p>
                        </div>

                        <div>
                          <p>Publisher Location</p>
                          <p className="mt-2">
                            {version.publicationDetails?.publisherLocation ??
                              "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full space-y-2">
              <div>
                <Label>Group (optional)</Label>
              </div>

              <GroupsCombobox
                selected={selectedGroup}
                onChange={(group) => {
                  setSelectedGroup(group);
                  if (group) {
                    form.setValue("groupId", group.id);
                  } else {
                    form.setValue("groupId", undefined);
                  }
                }}
              />
            </div>

            <div>
              <Button type="submit" disabled={isLoading}>
                {isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="mt-10 flex h-[200px] items-center justify-center rounded-lg border-2 border-gray-200">
          <p className="text-lg font-bold">Select a book</p>
        </div>
      )}
    </div>
  );
}
