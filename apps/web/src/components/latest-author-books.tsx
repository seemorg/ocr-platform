import { api } from "@/trpc/react";

interface LatestAuthorBooksProps {
  authorSlug?: string;
}

export default function LatestAuthorBooks({
  authorSlug,
}: LatestAuthorBooksProps) {
  const enabled = !!authorSlug;
  const { data: authorBooks, isLoading } =
    api.usulBook.getLatestByAuthor.useQuery(
      { slug: authorSlug ?? "" },
      { enabled },
    );

  if (!enabled) return null;

  const books = authorBooks ?? [];

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">Books by this author:</p>
      <ul className="mt-4 flex h-[250px] flex-col gap-2 overflow-y-auto">
        {isLoading ? (
          <p>Loading...</p>
        ) : books.length > 0 ? (
          books.map((book, idx) => (
            <div key={book.id} className="flex items-center gap-3">
              <p>
                {idx + 1}. {book.primaryNameTranslations[0]?.text ?? ""}
              </p>
              <a
                href={`https://usul.ai/t/${book.slug}`}
                className="text-sm text-primary underline"
                target="_blank"
              >
                View on usul
              </a>
            </div>
          ))
        ) : (
          <p>No books for this author</p>
        )}
      </ul>
    </div>
  );
}
