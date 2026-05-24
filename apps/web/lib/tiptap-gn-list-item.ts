import ListItem from "@tiptap/extension-list-item";

/**
 * One paragraph per list item — prevents splitBlock from stacking multiple
 * <p> tags in a single <li> (the "only the first line has a bullet" bug).
 */
export const GnListItem = ListItem.extend({
  name: "listItem",
  priority: 1000,
  content: "paragraph",
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    };
  },
});
