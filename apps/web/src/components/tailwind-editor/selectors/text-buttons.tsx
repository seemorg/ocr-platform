import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BoldIcon,
  ItalicIcon,
  LanguagesIcon,
  StrikethroughIcon,
  SuperscriptIcon,
  UnderlineIcon,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";

import type { SelectorItem } from "./node-selector";

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const items: SelectorItem[] = [
    {
      name: "bold",
      isActive: (editor) => editor.isActive("bold"),
      command: (editor) => editor.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: "italic",
      isActive: (editor) => editor.isActive("italic"),
      command: (editor) => editor.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: "underline",
      isActive: (editor) => editor.isActive("underline"),
      command: (editor) => editor.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: "strike",
      isActive: (editor) => editor.isActive("strike"),
      command: (editor) => editor.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    {
      name: "superscript",
      isActive: (editor) => editor.isActive("superscript"),
      command: (editor) => editor.chain().focus().toggleSuperscript().run(),
      icon: SuperscriptIcon,
    },
    {
      name: "arabicNumbers",
      command: (editor) => editor.chain().focus().toggleNumbers().run(),
      icon: (() => <span className="text-xs font-bold">123</span>) as any,
    },
  ];

  return (
    <div className="flex">
      {items.map((item, index) => (
        <EditorBubbleItem
          key={index}
          onSelect={(editor) => {
            item.command(editor);
          }}
        >
          <Button size="sm" className="rounded-none" variant="ghost">
            <item.icon
              className={cn("h-4 w-4", {
                "text-blue-500": item.isActive?.(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
