import { Placeholder } from "novel/extensions";

import { defaultServerExtensions } from "./server-extensions";

const placeholder = (placeholderText?: string, direction?: "ltr" | "rtl") =>
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return direction === "ltr"
          ? `Title ${node.attrs.level}`
          : `عنوان ${node.attrs.level}`;
      }

      return (
        placeholderText ??
        (direction === "ltr"
          ? "Press '/' for commands"
          : "اضغط على '/' للأوامر")
      );
    },
    includeChildren: true,
  });

export const defaultExtensions = (
  placeholderText?: string,
  direction?: "ltr" | "rtl",
) => [placeholder(placeholderText, direction), ...defaultServerExtensions];
