import { Extension } from "@tiptap/core";

/**
 * Word-like list keys. Blocks default Enter from splitting paragraphs inside a
 * single <li> (which looks like "only the first line has a bullet").
 */
export const GnListKeymap = Extension.create({
  name: "gnListKeymap",
  priority: 1000,
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
        if (!editor.isActive("listItem")) return false;
        if (editor.can().splitListItem("listItem")) {
          return editor.chain().splitListItem("listItem").run();
        }
        if (editor.can().liftListItem("listItem")) {
          return editor.chain().liftListItem("listItem").run();
        }
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
