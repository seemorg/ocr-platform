"use client";

import type { EditorInstance, JSONContent } from "novel";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { ShouldShowProps } from "@/types/menus";
import { isTextSelection } from "@tiptap/core";
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
import { TableMenus } from "./table";
import { useSettingsStore } from "@/stores/settings-store";

export const isTableGripSelected = (node: HTMLElement) => {
  let container = node;

  while (container && !["TD", "TH"].includes(container.tagName)) {
    container = container.parentElement!;
  }

  const gripColumn =
    container &&
    container.querySelector &&
    container.querySelector("a.grip-column.selected");
  const gripRow =
    container &&
    container.querySelector &&
    container.querySelector("a.grip-row.selected");

  if (gripColumn || gripRow) {
    return true;
  }

  return false;
};

const isCustomNodeSelected = (node: HTMLElement) => {
  return isTableGripSelected(node);
};

const isTextSelected = ({ editor }: { editor: EditorInstance }) => {
  const {
    state: {
      doc,
      selection,
      selection: { empty, from, to },
    },
  } = editor;

  // Sometime check for `empty` is not enough.
  // Doubleclick an empty paragraph returns a node size of 2.
  // So we check also for an empty text size.
  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && isTextSelection(selection);

  if (empty || isEmptyTextBlock || !editor.isEditable) {
    return false;
  }

  return true;
};

interface EditorProps {
  initialValue?: JSONContent;
  onChange?: (value: JSONContent) => void;
  className?: string;
  disabled?: boolean;
  placeholderText?: string;
}

const Editor = ({
  initialValue,
  onChange,
  className,
  disabled,
  placeholderText,
}: EditorProps) => {
  const direction = useSettingsStore((s) => s.direction);
  const extensions = useMemo(
    () => [...defaultExtensions(placeholderText, direction), slashCommand],
    [direction],
  );
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [editorRef, setEditorRef] = useState<EditorInstance | null>(null);
  const menuContainerRef = useRef(null);

  const shouldShow = useCallback(({ view, from, editor }: ShouldShowProps) => {
    if (!view) {
      return false;
    }

    const domAtPos = view.domAtPos(from || 0).node as HTMLElement;
    const nodeDOM = view.nodeDOM(from || 0) as HTMLElement;
    const node = nodeDOM || domAtPos;

    if (isCustomNodeSelected(node)) {
      return false;
    }

    return isTextSelected({ editor: editor! });
  }, []);

  const debouncedUpdates = useDebouncedCallback((editor: EditorInstance) => {
    if (onChange) {
      const json = editor.getJSON();
      onChange(json);
    }
  }, 500);

  useEffect(() => {
    if (disabled) {
      editorRef?.setEditable(false);
      // set content to readonly
      editorRef?.commands.setContent("Regenerating...");
    }
  }, [disabled, editorRef]);

  return (
    <div
      className={cn(
        "relative w-full",
        direction === "ltr" ? "ltr-editor" : "rtl-editor",
      )}
    >
      <EditorRoot>
        <EditorContent
          key={direction}
          immediatelyRender={false}
          initialContent={initialValue}
          extensions={extensions}
          className={cn(
            "relative min-h-[500px] w-full border-muted bg-background px-6 py-6 sm:rounded-lg sm:border sm:shadow-lg",
            className,
            disabled && "cursor-not-allowed opacity-70",
          )}
          ref={menuContainerRef}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class:
                "prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
              dir: direction,
            },
          }}
          onCreate={({ editor }) => {
            setEditorRef(editor);
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
            shouldShow={shouldShow}
          >
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />

            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />

            <Separator orientation="vertical" />
            <TextButtons />
          </EditorBubble>

          <TableMenus menuContainerRef={menuContainerRef} />
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default Editor;
