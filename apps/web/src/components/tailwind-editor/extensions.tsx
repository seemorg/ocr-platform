import { Placeholder } from "novel/extensions";

import { defaultServerExtensions } from "./server-extensions";

const placeholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return `عنوان ${node.attrs.level}`;
    }

    return "اضغط على '/' للأوامر";
  },
  includeChildren: true,
});

export const defaultExtensions = [placeholder, ...defaultServerExtensions];
