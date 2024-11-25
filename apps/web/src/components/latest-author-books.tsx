import { api } from "@/trpc/react";

interface LatestAuthorBooksProps {
  authorSlug?: string;
}

export default function LatestAuthorBooks({
  authorSlug,
}: LatestAuthorBooksProps) {
  const { data: authorBooks } = api.usulBook.getLatestByAuthor.useQuery(
    { slug: authorSlug ?? "" },
    { enabled: !!authorSlug },
  );

  const books = authorBooks ?? [];

  if (!authorSlug || !books || books.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">Latest books by this author:</p>
      <ul className="mt-2 flex max-h-[300px] flex-col gap-2 overflow-y-auto">
        {books.map((book) => (
          <div key={book.id} className="flex items-center gap-2">
            <p>{book.primaryNameTranslations[0]?.text ?? ""}</p>
            <a
              href={`https://usul.ai/t/${book.slug}`}
              className="text-sm text-primary underline"
              target="_blank"
            >
              View on usul
            </a>
          </div>
        ))}
      </ul>
    </div>
  );
}
