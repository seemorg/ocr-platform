"use client";

import { useRouter } from "next/navigation";
import { DeleteModal } from "@/components/delete-modal";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export default function DeleteBookButton({
  textId,
  redirectTo,
}: {
  textId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { mutateAsync: deleteBook, isPending: isDeletingBook } =
    api.usulBook.deleteBook.useMutation({
      onSuccess: () => {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      },
    });

  return (
    <DeleteModal
      trigger={
        <Button variant="destructive" disabled={isDeletingBook}>
          {isDeletingBook ? "Deleting..." : "Delete"}
        </Button>
      }
      onDelete={() => deleteBook({ id: textId })}
    />
  );
}
