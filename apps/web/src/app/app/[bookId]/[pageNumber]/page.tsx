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
import { LogLevel, useLogger } from "next-axiom";
import toast from "react-hot-toast";

import type { Book, Page } from "@usul-ocr/db";
import { PageFlag, PageOcrStatus } from "@usul-ocr/db";

import { useAppContext } from "../../providers";
import Alerts from "./alerts";
import Presence from "./presence";
import { useSettingsStore } from "@/stores/settings-store";

// recursively loop over `value` and remove all `textStyle` marks
const removeTextStyleMarks = (value: JSONContent) => {
  let newValue = structuredClone(value);

  if (Array.isArray(newValue)) {
    newValue = newValue.map(removeTextStyleMarks);
  }

  if (Array.isArray(newValue.content)) {
    newValue.content = newValue.content.map(removeTextStyleMarks);
  }

  if (newValue.marks) {
    newValue.marks = newValue.marks.filter((mark) => mark.type !== "textStyle");

    if (newValue.marks.length === 0) {
      newValue.marks = undefined;
    }
  }

  return newValue;
};

const extensions = defaultExtensions();

const deserializeTipTapValue = (value: JSONContent) => {
  return generateHTML(removeTextStyleMarks(value), extensions);
};

const serializeTipTapValue = (value?: string | null) => {
  return value ? generateJSON(value, extensions) : undefined;
};

export default function AppPage({
  params: { bookId, pageNumber },
}: {
  params: {
    bookId: string;
    pageNumber: string;
  };
}) {
  const { user } = useAppContext();
  const {
    data: page,
    error,
    isPending,
  } = api.page.get.useQuery({
    bookId,
    pageNumber: Number(pageNumber),
  });

  if (isPending)
    return (
      <Container className="flex min-h-screen w-full flex-col pb-28 pt-14">
        <Container className="flex justify-between">
          <div className="h-10 w-[400px] max-w-full animate-pulse bg-secondary" />

          <div className="flex items-center gap-5">
            <Button size="icon" variant="secondary" disabled>
              <ChevronLeft className="size-5" />
            </Button>

            <Button size="icon" variant="secondary" disabled>
              <ChevronRight className="size-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" disabled>
                  <Wrench className="size-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem>
                  <FileX2 className="mr-2 size-4" />
                  Mark page as Empty
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <RotateCw className="mr-2 size-4" />
                  Regenerate page using AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button disabled>Submit</Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon">
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem className="text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Container>

        <Container className="mt-8 flex h-full flex-1 justify-between gap-10">
          <div className="aspect-[1/1.5] w-[40%] flex-shrink-0">
            <div className="h-full w-full animate-pulse bg-secondary" />

            <div className="mt-5 h-[200px] w-full animate-pulse rounded-md border border-muted bg-secondary shadow-sm" />
          </div>

          <div className="flex-1">
            <div className="h-[500px] w-full animate-pulse rounded-md border border-muted bg-secondary shadow-sm" />

            <div className="mt-5 h-[200px] w-full animate-pulse rounded-md border border-muted bg-secondary shadow-sm" />

            <div className="mt-5 flex items-center gap-3">
              <Label htmlFor="page-number">Page Number</Label>
              <Input
                id="page-number"
                className="max-w-32"
                type="number"
                disabled
              />
            </div>
          </div>
        </Container>
      </Container>
    );

  if (error) return <div>Error: {error.message}</div>;

  return <InnerPage page={page} user={user} />;
}

const InnerPage = ({
  page,
  user,
}: {
  page: Page & {
    book: Book;
  };
  user: Session["user"];
}) => {
  const { direction, setDirection } = useSettingsStore();
  const email = user.email ?? user.id;
  const log = useLogger({
    source: "app/[bookId]/[pageNumber]/page.tsx",
    args: { email },
  });

  const router = useRouter();
  const utils = api.useUtils();

  const parsedValue = useMemo(() => {
    const value = page.content ?? page.ocrContent;
    return serializeTipTapValue(value);
  }, [page]);
  const parsedFootnotesValue = useMemo(() => {
    const value = page.footnotes ?? page.ocrFootnotes;
    return serializeTipTapValue(value);
  }, [page]);
  const parsedEditorialNotesValue = useMemo(() => {
    const value = page.editorialNotes;
    return serializeTipTapValue(value);
  }, [page]);

  const [value, setValue] = useState<JSONContent | undefined>(parsedValue);
  const [footnotesValue, setFootnotesValue] = useState<JSONContent | undefined>(
    parsedFootnotesValue,
  );
  const [editorialNotesValue, setEditorialNotesValue] = useState<
    JSONContent | undefined
  >(parsedEditorialNotesValue);
  const [pageNumber, setPageNumber] = useState(page.pageNumber ?? undefined);
  const [isRegenerating, setIsRegenerating] = useState(
    page.ocrStatus === PageOcrStatus.PROCESSING,
  );

  const { mutateAsync, isPending } = api.page.update.useMutation();

  const logout = async () => {
    await signOut({ redirect: false, callbackUrl: "/login" });
    router.push("/login");
  };

  const submit = async () => {
    try {
      await mutateAsync({
        pageId: page.id,
        content: value ? deserializeTipTapValue(value) : undefined,
        footnotesContent: footnotesValue
          ? deserializeTipTapValue(footnotesValue)
          : undefined,
        editorialNotesContent: editorialNotesValue
          ? deserializeTipTapValue(editorialNotesValue)
          : undefined,
        pageNumber,
      });

      toast.success("Page updated successfully");
      router.push(`/app/${page.bookId}/${page.pdfPageNumber + 1}`);
      utils.page.get.reset();
    } catch (error: any) {
      toast.error("Something went wrong!");
      log.logHttpRequest(
        LogLevel.error,
        error.message,
        {
          host: window.location.href,
          path: `/app/${page.bookId}/${page.pdfPageNumber}`,
        },
        {
          error: error.name,
          cause: error.cause,
          stack: error.stack,
          digest: error.digest,
          content: value,
          footnotesContent: footnotesValue,
        },
      );
    }
  };

  const handleMarkAsEmpty = async () => {
    await mutateAsync({
      pageId: page.id,
      flags: [PageFlag.EMPTY],
    });

    toast.success("Page updated successfully");
    router.push(`/app/${page.bookId}/${page.pdfPageNumber + 1}`);
    utils.page.get.reset();
  };

  const handleRedoOCR = async () => {
    await mutateAsync({
      pageId: page.id,
      redoOcr: true,
    });

    toast.success("Redoing OCR... check back in a few minutes");
    setIsRegenerating(true);

    utils.page.get.invalidate({
      bookId: page.bookId,
      pageNumber: page.pdfPageNumber,
    });
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

          <Button onClick={submit} disabled={isPending}>
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

              <DropdownMenuItem
                onClick={() =>
                  setDirection(direction === "ltr" ? "rtl" : "ltr")
                }
              >
                Switch to {direction === "ltr" ? "RTL" : "LTR"}
              </DropdownMenuItem>

              <DropdownMenuItem className="text-destructive" onClick={logout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Container>

      <Container className="mt-5 flex flex-col gap-3">
        <Alerts page={page} />
        {process.env.NODE_ENV !== "development" && (
          <Presence pageId={page.id} user={user} />
        )}
      </Container>

      <Container className="mt-8 flex h-full flex-1 justify-between gap-10">
        <div className="aspect-[1/1.5] w-[40%] flex-shrink-0">
          <div className="h-full w-full bg-secondary">
            {/* <img src="/sample.png" className="h-full w-full object-cover" /> */}
            <Zoom
              src={`${env.NEXT_PUBLIC_OCR_SERVER_URL}book/${page.book.id}/${page.pdfPageNumber}`}
              width="100%"
              height="100%"
              className="object-cover"
              zoomScale={2}
            />
          </div>

          <ScrollArea className="mt-5 h-[200px] w-full rounded-md border border-muted shadow-sm">
            <Editor
              className="min-h-[200px] sm:rounded-none sm:border-none sm:shadow-none"
              initialValue={editorialNotesValue}
              onChange={(newValue) => setEditorialNotesValue(newValue)}
              placeholderText={
                direction === "ltr" ? "Editorial Notes" : "تعليقات موقع اصول"
              }
            />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>

        <div className="flex-1">
          <ScrollArea className="h-[500px] w-full rounded-md border border-muted shadow-sm">
            <Editor
              className="sm:rounded-none sm:border-none sm:shadow-none"
              initialValue={value}
              disabled={isRegenerating}
              onChange={(newValue) => setValue(newValue)}
            />
          </ScrollArea>

          <ScrollArea className="mt-5 h-[200px] w-full rounded-md border border-muted shadow-sm">
            <Editor
              className="min-h-[200px] sm:rounded-none sm:border-none sm:shadow-none"
              initialValue={footnotesValue}
              disabled={isRegenerating}
              onChange={(newValue) => setFootnotesValue(newValue)}
              placeholderText={
                direction === "ltr" ? "Page Footnotes" : "هوامش الصفحة"
              }
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
              onChange={(e) => setPageNumber(Number(e.target.value))}
            />
          </div>
        </div>
      </Container>
    </Container>
  );
};
