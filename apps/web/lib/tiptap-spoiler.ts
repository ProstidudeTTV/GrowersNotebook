import { Mark, mergeAttributes } from "@tiptap/core";

/** Inline spoiler (blur until clicked on the post page). */
export const Spoiler = Mark.create({
  name: "spoiler",

  parseHTML() {
    return [
      { tag: 'span[data-spoiler="true"]' },
      { tag: "span.gn-spoiler" },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-spoiler": "true",
        class: "gn-spoiler",
      }),
      0,
    ];
  },
});
