import React, { useCallback } from "react";
import { PopoverItem } from "@/components/ui/popover";
import { Toolbar } from "@/components/ui/toolbar";
import { MenuProps, ShouldShowProps } from "@/types/menus";
import { ArrowLeftToLine, ArrowRightToLine, Trash2Icon } from "lucide-react";
import { EditorBubble, EditorInstance } from "novel";

import { isColumnGripSelected } from "./utils";

export const TableColumnMenu = React.memo(
  ({
    editor,
    appendTo,
  }: {
    editor: EditorInstance;
    appendTo: MenuProps["appendTo"];
  }): JSX.Element => {
    const shouldShow = useCallback(
      ({ view, state, from }: ShouldShowProps) => {
        if (!state) {
          return false;
        }

        return isColumnGripSelected({ editor, view, state, from: from || 0 });
      },
      [editor],
    );

    const onAddColumnBefore = useCallback(() => {
      editor.chain().focus().addColumnBefore().run();
    }, [editor]);

    const onAddColumnAfter = useCallback(() => {
      editor.chain().focus().addColumnAfter().run();
    }, [editor]);

    const onDeleteColumn = useCallback(() => {
      editor.chain().focus().deleteColumn().run();
    }, [editor]);

    const onDeleteTable = useCallback(() => {
      editor.chain().focus().deleteTable().run();
    }, [editor]);

    return (
      <EditorBubble
        pluginKey="tableColumnMenu"
        updateDelay={0}
        tippyOptions={{
          appendTo: () => {
            return appendTo?.current;
          },
          offset: [0, 15],
          popperOptions: {
            modifiers: [{ name: "flip", enabled: false }],
          },
        }}
        shouldShow={shouldShow}
      >
        <Toolbar.Wrapper isVertical>
          <PopoverItem
            icon={ArrowLeftToLine}
            close={false}
            label="Add column before"
            onClick={onAddColumnBefore}
          />
          <PopoverItem
            icon={ArrowRightToLine}
            close={false}
            label="Add column after"
            onClick={onAddColumnAfter}
          />
          <PopoverItem
            icon={Trash2Icon}
            close={false}
            label="Delete column"
            onClick={onDeleteColumn}
          />
          <PopoverItem
            icon={Trash2Icon}
            close={false}
            label="Delete table"
            onClick={onDeleteTable}
          />
        </Toolbar.Wrapper>
      </EditorBubble>
    );
  },
);

TableColumnMenu.displayName = "TableColumnMenu";

export default TableColumnMenu;
