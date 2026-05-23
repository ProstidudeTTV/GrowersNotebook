import { Extension } from "@tiptap/core";

/**
 * Word-like list keys: Enter splits items, Tab/Shift+Tab nest, Backspace merges/lifts.
 * Complements StarterKit list nodes when default key handling is inconsistent.
 */
export const GnListKeymap = Extension.create({
  name: "gnListKeymap",
  priority: 200,
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
        return false;
      },
      Backspace: ({ editor }) => {
        if (!editor.isActive("listItem")) return false;
        const { empty, $from } = editor.state.selection;
        if (!empty) return false;
        const atItemStart = $from.parentOffset === 0;
        if (!atItemStart) return false;
        const parentText = $from.parent.textContent;
        if (parentText.length === 0) {
          if (editor.can().liftListItem("listItem")) {
            return editor.chain().liftListItem("listItem").run();
          }
        }
        return false;
      },
    };
  },
});
