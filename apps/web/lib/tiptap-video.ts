import { Node, mergeAttributes } from "@tiptap/core";

/** Block HTML5 video (uploaded MP4/WebM/MOV), Reddit-style embed. */
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: true,
        playsInline: true,
        preload: "metadata",
        class: "gn-post-media-video",
      }),
    ];
  },
});
