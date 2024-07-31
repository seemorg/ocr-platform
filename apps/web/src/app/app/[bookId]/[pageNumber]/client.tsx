"use client";

import type { JSONContent } from "novel";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Editor from "@/components/tailwind-editor";
import { defaultExtensions } from "@/components/tailwind-editor/extensions";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";

import { Book, Page, PageFlag } from "@usul-ocr/db";

// const defaultValue = {
//   type: "doc",
//   content: [
//     {
//       type: "heading",
//       attrs: {
//         level: 1,
//       },
//       content: [
//         {
//           type: "text",
//           text: "بسم الله الرحمن الرحيم",
//         },
//       ],
//     },
//     {
//       type: "heading",
//       attrs: {
//         level: 2,
//       },
//       content: [
//         {
//           type: "text",
//           text: "أبواب الصلاة",
//         },
//       ],
//     },
//     {
//       type: "heading",
//       attrs: {
//         level: 3,
//       },
//       content: [
//         {
//           type: "text",
//           text: "١- باب وقت الصلاة",
//         },
//       ],
//     },
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: "١ - قال محمد بن الحسن : أخبرنا مالك ، عن يزيد بن زياد مولى لبني هاشم ، عن عبد الله بن رافع مولى أم سلمة زوج النبي صلى الله عليه وسلم ، عن أبي هريرة ، أنه سأله عن وقت الصلاة؟ فقال أبو هريرة : أنا أخبرك : صل الظهر إذا كان ظلك مثلك ، والعصر إذا كان ظلك مثليك ، والمغرب إذا غربت الشمس.",
//         },
//       ],
//     },
//   ],
// };

// const defaultFootnotesValue = {
//   type: "doc",
//   content: [
//     {
//       type: "heading",
//       attrs: {
//         level: 3,
//       },
//       content: [
//         {
//           type: "text",
//           text: "تحقيقات وتعليقات على موطأ محمد",
//         },
//       ],
//     },
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: '١) وقته جمع كثرة ، وفي رواية ابن بكر " الأوقات" وهو جمع قلة ، وهو أظهر، لكونها خمسة أوقات للصوات المفروضة ، ونقلوا لتكرارها كل يوم ، تصير كثيرة ، وكل من الجمعين يقوم مقام الآخر.',
//         },
//       ],
//     },
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: "وفي كثير من نسخ الموطأ ال: ثنا أنا نا ، وهي طريقة تغلب على المحدثين في مصنفاتهم ، من الاختصار على الجزء الآخر ، وحديثنا ، فيقولون من حدثنا الأبهري والسيوري والألف ، وقد يسقطون الها ، ويقتصرون على الضمير، ويقولون من خبرنا أنا نا، فيسقطون الها، والضمير. وقد يزيد بعضهم الها بعد الهاء، ولا تحسن زيادة الهاء ، وقد يقتصرون على الضمير.",
//         },
//       ],
//     },
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: "وكذلك ال: يحدثون من حديثي نا ، ومن أخبارني ، أنا ، أو أنا ،",
//         },
//       ],
//     },
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: 'نقل الحاكم : الذي اختاره وعملته مشايخكم مشايخ عصره ، أن يقال فيما سمعه مرة بلفظ السمع، حدثني ، و عمن غيره، و ما روى عليه ، أخبرني، وبه تأخذ جمهرته أخبرنا أبو زهرة أنه وهب السرمدي: (ن الدلال) وهو منصب مسلم والنساء وحكاه البيهقي في الكفيل للفقيه وأحمد، قال ابن رواح يجوز إبدال (حدثنا بأخبرنا) وعكسه،مع ذلك الاكتفاء الغير المشهور ، وإن كان فاضل أهل العلم ، غير خلاف، عديل الحاكم عليه اجتمعت البخاري والمالك في روايته، وأكد أهل العلم كما في " تقريب الراوي ١ ص ٢٤٩ ) من النسخة الحقيقة.',
//         },
//       ],
//     },
//   ],
// };

const serializeTipTapValue = (value: JSONContent) => {
  return generateHTML(value, defaultExtensions);
};

export default function AppPage({
  page,
}: {
  page: Page & {
    reviewedBy?: { email: string | null } | null;
  } & {
    book: Book;
  };
}) {
  const session = useSession();
  const router = useRouter();
  const email =
    session.status === "loading" ? "Loading..." : session.data?.user.email;

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

  const { mutateAsync, isPending } = api.book.updatePage.useMutation({
    onSuccess: () => {
      toast.success("Page updated successfully");
      router.push(`/app/${page.bookId}/${page.pdfPageNumber + 1}`);
    },
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

    setHasChanges(false);
  };

  return (
    <main className="flex min-h-screen w-full flex-col pb-28 pt-14">
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

      <Container className="mt-5">
        {page.reviewed ? (
          <Alert className="[&>svg+div]:translate-y-0" variant="success">
            <CheckCircle className="!top-3 h-4 w-4" />
            <AlertTitle className="mb-0">
              This page has been submitted by {page.reviewedBy?.email} at{" "}
              {page.reviewedAt?.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              . You can still edit it and override the submission
            </AlertTitle>
          </Alert>
        ) : page.flags.includes(PageFlag.NEEDS_ADDITIONAL_REVIEW) ? (
          <Alert className="[&>svg+div]:translate-y-0" variant="warning">
            <AlertCircle className="!top-3 h-4 w-4" />
            <AlertTitle className="mb-0">
              This page is more likely to contain mistakes and needs additional
              time to review
            </AlertTitle>
          </Alert>
        ) : null}
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
          {/* <div className="mb-10 flex items-center justify-end gap-5">
          
          </div> */}

          <ScrollArea className="h-[500px] w-full rounded-md border border-muted shadow-sm">
            <Editor
              className="sm:rounded-none sm:border-none sm:shadow-none"
              initialValue={value}
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
              onChange={(e) => {
                setHasChanges(true);
                setPageNumber(Number(e.target.value));
              }}
            />
          </div>
        </div>
      </Container>

      {/* <div className="fixed bottom-0 left-0 right-0 flex h-20 items-center justify-center gap-5 border-t border-border bg-white/5 backdrop-blur-md">
       
      </div> */}
    </main>
  );
}
