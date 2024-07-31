import { Container } from "@/components/ui/container";

export default function PageLayout({
  title,
  children,
}: {
  title: string | React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container>
        <div className="mb-10 flex items-center gap-3">
          <h1 className="flex items-center text-2xl font-bold">{title}</h1>
        </div>

        {children}
      </Container>
    </main>
  );
}
