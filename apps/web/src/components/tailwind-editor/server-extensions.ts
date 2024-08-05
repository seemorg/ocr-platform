import { Document } from "@tiptap/extension-document";
import Superscript from "@tiptap/extension-superscript";
import { cx } from "class-variance-authority";
import {
  HorizontalRule,
  StarterKit,
  TaskItem,
  TaskList,
  TiptapLink,
} from "novel/extensions";
import TextDirection from "tiptap-text-direction";

import ArabicNumbers from "./arabic-numbers-extension";
import { Table, TableCell, TableHeader, TableRow } from "./table/extensions";

const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cx(
      "text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer",
    ),
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cx("not-prose pl-2"),
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: cx("flex gap-2 items-start my-4"),
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cx("mt-4 mb-6 border-t border-muted-foreground"),
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cx("list-disc list-outside leading-3 -mt-2"),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cx("list-decimal list-outside leading-3 -mt-2"),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cx("leading-normal -mb-2"),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cx("border-l-4 border-primary"),
    },
  },
  codeBlock: false,
  code: false,
  horizontalRule: false,
  dropcursor: {
    color: "#DBEAFE",
    width: 4,
  },
  gapcursor: false,
  document: false,
});

const textDirection = TextDirection.configure({
  defaultDirection: "rtl",
});
const superscript = Superscript;
const arabicNumbers = ArabicNumbers;
const tiptapDocument = Document.configure({ content: "(block|columns)+" });

export const defaultServerExtensions = [
  tiptapDocument,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  starterKit,
  tiptapLink,
  taskList,
  taskItem,
  horizontalRule,
  textDirection,
  superscript,
  arabicNumbers,
];
