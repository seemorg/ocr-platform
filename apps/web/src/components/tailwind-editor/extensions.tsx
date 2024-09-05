import { Placeholder } from "novel/extensions";

import { defaultServerExtensions } from "./server-extensions";

const placeholder = (placeholderText?: string) =>
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return `عنوان ${node.attrs.level}`;
      }

      return placeholderText ?? "اضغط على '/' للأوامر";
    },
    includeChildren: true,
  });

export const defaultExtensions = (placeholderText?: string) => [
  placeholder(placeholderText),
  ...defaultServerExtensions,
];
