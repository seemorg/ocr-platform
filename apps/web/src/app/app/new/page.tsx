"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";

export default function NewBookPage() {
  const { mutateAsync, isPending } = api.book.create.useMutation({
    onSuccess: () => {
      toast.success("Book created successfully");
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [authorId, setAuthorId] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await mutateAsync({ pdfUrl, authorId });
  };

  return (
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container>
        <h1 className="text-2xl font-bold">New Book</h1>

        <form onSubmit={handleSubmit} className="mt-20 flex flex-col gap-10">
          {/* <div className="flex flex-col gap-10 sm:flex-row">
            <div className="w-full">
              <Label>Arabic Name</Label>
              <Input
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
              />
            </div>

            <div className="w-full">
              <Label>English Name</Label>
              <Input
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
              />
            </div>
          </div> */}

          <div className="flex flex-col gap-10 sm:flex-row">
            <div className="w-full">
              <Label>Author ID</Label>
              <Input
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
              />
            </div>

            <div className="w-full">
              <Label>PDF URL</Label>
              <Input
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
