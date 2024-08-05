import { MutableRefObject } from "react";
import { useEditor } from "novel";

import { TableColumnMenu, TableRowMenu } from "./menus";

export const TableMenus = ({
  menuContainerRef,
}: {
  menuContainerRef: MutableRefObject<any>;
}) => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <>
      <TableRowMenu editor={editor} appendTo={menuContainerRef} />
      <TableColumnMenu editor={editor} appendTo={menuContainerRef} />
    </>
  );
};
