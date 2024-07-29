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

// import { handleImageDrop, handleImagePaste } from "novel/plugins";
// import { uploadFn } from "./image-upload";
import { Separator } from "../ui/separator";
import { defaultExtensions } from "./extensions";
import { ColorSelector } from "./selectors/color-selector";
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

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  // const highlightCodeblocks = (content: string) => {
  //   const doc = new DOMParser().parseFromString(content, "text/html");
  //   doc.querySelectorAll("pre code").forEach((el) => {
  //     // @ts-ignore
  //     // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
  //     hljs.highlightElement(el);
  //   });
  //   return new XMLSerializer().serializeToString(doc);
  // };

  const debouncedUpdates = useDebouncedCallback((editor: EditorInstance) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    // setCharsCount(editor.storage.characterCount.words() as number);

    if (onChange) {
      const json = editor.getJSON();
      onChange(json);
    }
    // window.localStorage.setItem(
    //   "html-content",
    //   highlightCodeblocks(editor.getHTML()),
    // );
    // window.localStorage.setItem("novel-content", JSON.stringify(json));
    // window.localStorage.setItem(
    //   "markdown",
    //   editor.storage.markdown.getMarkdown(),
    // );
    // setSaveStatus("Saved");
  }, 500);

  // useEffect(() => {
  //   const content = window.localStorage.getItem("novel-content");
  //   if (content) setInitialContent(JSON.parse(content));
  //   else setInitialContent(defaultEditorContent);
  // }, []);

  // if (!initialContent) return null;

  return (
    <div className="relative w-full">
      {/* <div className="absolute left-5 top-5 z-10 mb-5 flex gap-2">
        <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">
          {saveStatus}
        </div>
        <div
          className={
            charsCount
              ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground"
              : "hidden"
          }
        >
          {charsCount} Words
        </div>
      </div> */}
      <EditorRoot>
        <EditorContent
          initialContent={initialValue ?? { text: "Hello world" }}
          extensions={extensions}
          className={cn(
            "relative min-h-[500px] w-full border-muted bg-background px-6 py-6 sm:rounded-lg sm:border sm:shadow-lg",
            className,
          )}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            // handlePaste: (view, event) =>
            //   handleImagePaste(view, event, uploadFn),
            // handleDrop: (view, event, _slice, moved) =>
            //   handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
              dir: "rtl",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            // setSaveStatus("Unsaved");
          }}
          // slotAfter={<ImageResizer />}
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
