"use client";

import type { JSONContent } from "novel";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Editor from "@/components/tailwind-editor";
import { defaultExtensions } from "@/components/tailwind-editor/extensions";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Zoom from "@/components/zoom-image";
import { env } from "@/env";
import { api } from "@/trpc/react";
import { generateHTML, generateJSON } from "@tiptap/html";
import {
  ChevronLeft,
  ChevronRight,
  FileX2,
  MoreHorizontal,
  RotateCw,
  Wrench,
} from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

import type { Book, Page } from "@usul-ocr/db";
import { PageFlag, PageOcrStatus } from "@usul-ocr/db";

import Alerts from "./alerts";
import Presence from "./presence";

const serializeTipTapValue = (value: JSONContent) => {
  return generateHTML(value, defaultExtensions);
};

export default function AppPage({
  page,
  session,
}: {
  session: Session;
  page: Page & {
    reviewedBy?: { email: string | null } | null;
  } & {
    book: Book;
  };
}) {
  const router = useRouter();
  const email = session.user.email ?? session.user.id;

  const parsedValue = useMemo(() => {
    const value = page.content ?? page.ocrContent;
    return value ? generateJSON(value, defaultExtensions) : undefined;
  }, [page]);
  const parsedFootnotesValue = useMemo(() => {
    const value = page.footnotes ?? page.ocrFootnotes;
    return value ? generateJSON(value, defaultExtensions) : undefined;
  }, [page]);

  const [hasChanges, setHasChanges] = useState(false);

  const [value, setValue] = useState<JSONContent | undefined>(parsedValue);
  const [footnotesValue, setFootnotesValue] = useState<JSONContent | undefined>(
    parsedFootnotesValue,
  );
  const [pageNumber, setPageNumber] = useState(page.pageNumber ?? undefined);
  const [isRegenerating, setIsRegenerating] = useState(
    page.ocrStatus === PageOcrStatus.PROCESSING,
  );

  const { mutateAsync, isPending } = api.book.updatePage.useMutation({
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const logout = async () => {
    await signOut({ redirect: false, callbackUrl: "/login" });
    router.push("/login");
  };

  const submit = async () => {
    await mutateAsync({
      pageId: page.id,
      content: value ? serializeTipTapValue(value) : undefined,
      footnotesContent: footnotesValue
        ? serializeTipTapValue(footnotesValue)
        : undefined,
      pageNumber,
    });

    toast.success("Page updated successfully");
    router.refresh();
    router.push(`/app/${page.bookId}/${page.pdfPageNumber + 1}`);
    setHasChanges(false);
  };

  const handleMarkAsEmpty = async () => {
    await mutateAsync({
      pageId: page.id,
      flags: [PageFlag.EMPTY],
    });

    toast.success("Page updated successfully");
    router.refresh();
    router.push(`/app/${page.bookId}/${page.pdfPageNumber + 1}`);
    setHasChanges(false);
  };

  const handleRedoOCR = async () => {
    await mutateAsync({
      pageId: page.id,
      redoOcr: true,
    });

    toast.success("Redoing OCR... check back in a few minutes");
    setIsRegenerating(true);
    router.refresh();
  };

  return (
    <Container className="flex min-h-screen w-full flex-col pb-28 pt-14">
      <Container className="flex justify-between">
        <h3 className="text-4xl font-semibold">
          {page.book.arabicName ?? page.book.englishName}
        </h3>

        <div className="flex items-center gap-5">
          <Link href={`/app/${page.bookId}/${page.pdfPageNumber - 1}`}>
            <Button
              size="icon"
              variant="secondary"
              disabled={page.pdfPageNumber === 1}
            >
              <ChevronLeft className="size-5" />
            </Button>
          </Link>

          <Link href={`/app/${page.bookId}/${page.pdfPageNumber + 1}`}>
            <Button
              size="icon"
              variant="secondary"
              disabled={page.pdfPageNumber === page.book.totalPages}
            >
              <ChevronRight className="size-5" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <Wrench className="size-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleMarkAsEmpty}>
                <FileX2 className="mr-2 size-4" />
                Mark page as Empty
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleRedoOCR}>
                <RotateCw className="mr-2 size-4" />
                Regenerate page using AI
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={submit} disabled={isPending || !hasChanges}>
            {isPending ? "Submitting..." : "Submit"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuLabel>{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem className="text-destructive" onClick={logout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Container>

      <Container className="mt-5 flex flex-col gap-3">
        <Alerts page={page} />
        {/* <Presence pageId={page.id} session={session} /> */}
      </Container>

      <Container className="mt-8 flex h-full flex-1 justify-between gap-10">
        <div className="aspect-[1/1.5] h-full w-[40%] flex-shrink-0 bg-secondary">
          {/* <img src="/sample.png" className="h-full w-full object-cover" /> */}
          <Zoom
            src={`${env.NEXT_PUBLIC_OCR_SERVER_URL}book/${page.book.id}/${page.pdfPageNumber}`}
            width="100%"
            height="100%"
            className="object-cover"
            zoomScale={2}
          />
        </div>

        <div className="flex-1">
          <ScrollArea className="h-[500px] w-full rounded-md border border-muted shadow-sm">
            <Editor
              className="sm:rounded-none sm:border-none sm:shadow-none"
              initialValue={value}
              disabled={isRegenerating}
              onChange={(newValue) => {
                setHasChanges(true);
                setValue(newValue);
              }}
            />
          </ScrollArea>

          <ScrollArea className="mt-5 h-[200px] w-full rounded-md border border-muted shadow-sm">
            <Editor
              className="min-h-[200px] sm:rounded-none sm:border-none sm:shadow-none"
              initialValue={footnotesValue}
              disabled={isRegenerating}
              onChange={(newValue) => {
                setHasChanges(true);
                setFootnotesValue(newValue);
              }}
            />
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          <div className="mt-5 flex items-center gap-3">
            <Label htmlFor="page-number">Page Number</Label>
            <Input
              id="page-number"
              className="max-w-32"
              type="number"
              value={pageNumber}
              disabled={isRegenerating}
              onChange={(e) => {
                setHasChanges(true);
                setPageNumber(Number(e.target.value));
              }}
            />
          </div>
        </div>
      </Container>
    </Container>
  );
}
