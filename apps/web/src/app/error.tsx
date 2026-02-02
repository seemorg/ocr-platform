"use client";



export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">500</h1>
        <p className="mt-4 text-lg">Something went wrong</p>
        {error.message && (
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
