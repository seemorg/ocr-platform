import React, { useCallback } from "react";
import { PopoverItem } from "@/components/ui/popover";
import { Toolbar } from "@/components/ui/toolbar";
import { MenuProps, ShouldShowProps } from "@/types/menus";
import { ArrowDownToLine, ArrowUpToLine, Trash2Icon } from "lucide-react";
import { EditorBubble, EditorInstance } from "novel";

import { isRowGripSelected } from "./utils";

export const TableRowMenu = React.memo(
  ({
    editor,
    appendTo,
  }: {
    editor: EditorInstance;
    appendTo: MenuProps["appendTo"];
  }): JSX.Element => {
    const shouldShow = useCallback(
      ({ view, state, from }: ShouldShowProps) => {
        if (!state || !from) {
          return false;
        }

        return isRowGripSelected({ editor, view, state, from });
      },
      [editor],
    );

    const onAddRowBefore = useCallback(() => {
      editor.chain().focus().addRowBefore().run();
    }, [editor]);

    const onAddRowAfter = useCallback(() => {
      editor.chain().focus().addRowAfter().run();
    }, [editor]);

    const onDeleteRow = useCallback(() => {
      editor.chain().focus().deleteRow().run();
    }, [editor]);

    return (
      <EditorBubble
        // editor={editor}
        pluginKey="tableRowMenu"
        updateDelay={0}
        tippyOptions={{
          appendTo: () => {
            return appendTo?.current;
          },
          placement: "auto",
          offset: [0, 15],
          popperOptions: {
            modifiers: [{ name: "flip", enabled: false }],
          },
        }}
        shouldShow={shouldShow}
      >
        <Toolbar.Wrapper isVertical>
          <PopoverItem
            icon={ArrowUpToLine}
            close={false}
            label="Add row before"
            onClick={onAddRowBefore}
          />
          <PopoverItem
            icon={ArrowDownToLine}
            close={false}
            label="Add row after"
            onClick={onAddRowAfter}
          />
          <PopoverItem
            icon={Trash2Icon}
            close={false}
            label="Delete row"
            onClick={onDeleteRow}
          />
        </Toolbar.Wrapper>
      </EditorBubble>
    );
  },
);

TableRowMenu.displayName = "TableRowMenu";

export default TableRowMenu;
