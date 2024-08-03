// import Table from "@tiptap/extension-table";
// import TableCell from "@tiptap/extension-table-cell";
// import TableHeader from "@tiptap/extension-table-header";
// import TableRow from "@tiptap/extension-table-row";

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
  codeBlock: {
    HTMLAttributes: {
      class: cx(
        "rounded-md bg-muted text-muted-foreground border p-5 font-mono font-medium",
      ),
    },
  },
  code: {
    HTMLAttributes: {
      class: cx("rounded-md bg-muted  px-1.5 py-1 font-mono font-medium"),
      spellcheck: "false",
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: "#DBEAFE",
    width: 4,
  },
  gapcursor: false,
});

const textDirection = TextDirection.configure({
  defaultDirection: "rtl",
});

const superscript = Superscript.configure({});

const arabicNumbers = ArabicNumbers.configure({});

// const table = Table.configure({
//   resizable: true,
//   lastColumnResizable: false,
// });

// const tableRow = TableRow.extend({
//   allowGapCursor: false,
//   content: "tableCell*",
// });

// const tableCell = TableCell.extend({
//   allowGapCursor: false,
//   content: "tableHeader*",
// });

// const tableHeader = TableHeader.extend({
//   allowGapCursor: false,
//   content: "tableCell*",
// });

export const defaultServerExtensions = [
  starterKit,
  tiptapLink,
  taskList,
  taskItem,
  horizontalRule,
  textDirection,
  superscript,
  arabicNumbers,
  // table,
  // tableRow,
  // tableCell,
  // tableHeader,
];
