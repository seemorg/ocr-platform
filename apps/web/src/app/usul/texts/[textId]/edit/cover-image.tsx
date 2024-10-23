import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { RefreshCcwIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function CoverImage({
  coverImageUrl,
  bookId,
}: {
  coverImageUrl: string;
  bookId: string;
}) {
  const [hash, setHash] = useState<string>(() =>
    new Date().getTime().toString(30),
  );

  const { mutate: regenerateBookCover, isPending } =
    api.usulBook.regenerateBookCover.useMutation({
      onSuccess: () => {
        toast.success("Regeneration requested, refresh in a couple minutes");
      },
    });

  return (
    <div>
      <h2 className="text-2xl font-bold">Cover Image</h2>
      <div className="group relative mt-5 h-[370px] w-64 bg-muted">
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Button
            variant="outline"
            type="button"
            disabled={isPending}
            onClick={() => regenerateBookCover({ id: bookId })}
          >
            <RefreshCcwIcon className="mr-2 h-4 w-4" />{" "}
            {isPending ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>

        <img
          src={`${coverImageUrl}?t=${hash}`}
          alt="Cover Image"
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
