"use client";

import type { EditorInstance, JSONContent } from "novel";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
} from "novel";
import { handleCommandNavigation } from "novel/extensions";
import { useDebouncedCallback } from "use-debounce";

import { Separator } from "../ui/separator";
import { defaultExtensions } from "./extensions";
import { LinkSelector } from "./selectors/link-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";

const extensions = [...defaultExtensions, slashCommand];

interface EditorProps {
  initialValue?: JSONContent;
  onChange?: (value: JSONContent) => void;
  className?: string;
}

const Editor = ({ initialValue, onChange, className }: EditorProps) => {
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);

  const debouncedUpdates = useDebouncedCallback((editor: EditorInstance) => {
    if (onChange) {
      const json = editor.getJSON();
      onChange(json);
    }
  }, 500);

  return (
    <div className="relative w-full">
      <EditorRoot>
        <EditorContent
          immediatelyRender={false}
          initialContent={initialValue}
          extensions={extensions}
          className={cn(
            "relative min-h-[500px] w-full border-muted bg-background px-6 py-6 sm:rounded-lg sm:border sm:shadow-lg",
            className,
          )}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },

            attributes: {
              class:
                "prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
              dir: "rtl",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
          }}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <EditorBubble
            tippyOptions={{
              placement: "top",
            }}
            className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
          >
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />

            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />

            <Separator orientation="vertical" />
            <TextButtons />
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default Editor;
