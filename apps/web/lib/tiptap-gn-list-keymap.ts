import { Extension } from "@tiptap/core";

function inListItem(editor: {
  isActive: (name: string) => boolean;
}): boolean {
  return (
    editor.isActive("listItem") ||
    editor.isActive("bulletList") ||
    editor.isActive("orderedList")
  );
}

/**
 * Word-like list keys. Runs above TipTap's default Keymap (splitBlock on Enter)
 * so Enter creates a new list item, not another paragraph in the same <li>.
 */
export const GnListKeymap = Extension.create({
  name: "gnListKeymap",
  priority: 1001,
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (!editor.isActive("listItem")) return false;
        if (editor.can().sinkListItem("listItem")) {
          return editor.chain().sinkListItem("listItem").run();
        }
        return true;
      },
      "Shift-Tab": ({ editor }) => {
        if (!editor.isActive("listItem")) return false;
        if (editor.can().liftListItem("listItem")) {
          return editor.chain().liftListItem("listItem").run();
        }
        return true;
      },
      Enter: ({ editor }) => {
        if (!inListItem(editor)) return false;
        if (editor.commands.splitListItem("listItem")) return true;
        if (editor.commands.liftListItem("listItem")) return true;
        // Block splitBlock from adding paragraphs inside one <li>.
        return true;
      },
      Backspace: ({ editor }) => {
        if (!editor.isActive("listItem")) return false;
        const { empty, $from } = editor.state.selection;
        if (!empty) return false;
        if ($from.parentOffset !== 0) return false;
        if ($from.parent.textContent.length === 0) {
          if (editor.can().liftListItem("listItem")) {
            return editor.chain().liftListItem("listItem").run();
          }
        }
        return false;
      },
    };
  },
});
