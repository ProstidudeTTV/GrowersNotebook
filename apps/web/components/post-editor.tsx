"use client";

import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Spoiler } from "@/lib/tiptap-spoiler";

type PostEditorProps = {
  disabled?: boolean;
  initialJson?: Record<string, unknown> | null;
  onChange?: (payload: { json: Record<string, unknown>; html: string }) => void;
  /** Rendered on the right side of the toolbar (e.g. “Switch to Markdown”). */
  toolbarEnd?: ReactNode;
  /** Omit outer card frame when nested in `.gn-post-content-flow`. */
  embedded?: boolean;
};

const safeInitial = (raw: Record<string, unknown> | null | undefined) =>
  raw && typeof raw === "object" ? raw : undefined;

function sanitizeEditorHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ADD_TAGS: ["video", "sup"],
    ADD_ATTR: [
      "controls",
      "playsinline",
      "preload",
      "muted",
      "loading",
      "class",
      "data-spoiler",
      "data-revealed",
    ],
  });
}

function normalizeLinkHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^mailto:/i.test(t)) return t;
  // Allow example.com and //domain paths
  if (/^\/\//.test(t)) return `https:${t}`;
  return `https://${t}`;
}

const toolBase =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-40";

function toolClass(active: boolean, enabled: boolean): string {
  const surface = active
    ? "border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-ring))] bg-[color-mix(in_srgb,var(--gn-accent)_12%,var(--gn-surface-elevated))] text-[var(--gn-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--gn-accent)_22%,transparent)]"
    : "border-transparent bg-transparent text-[var(--gn-text)] hover:border-[var(--gn-ring)] hover:bg-[var(--gn-surface-hover)]";
  const dim = enabled ? "" : " opacity-50";
  return `${toolBase} ${surface}${dim}`;
}

function ToolbarDivider() {
  return (
    <span
      className="mx-0.5 hidden h-6 w-px shrink-0 bg-[var(--gn-divide)] sm:block"
      aria-hidden
    />
  );
}

function IconUndo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
    </svg>
  );
}

function IconRedo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
      />
    </svg>
  );
}

function IconListBullet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 5 4 5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V7H7z"
      />
    </svg>
  );
}

function IconListOrdered() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"
      />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"
      />
    </svg>
  );
}

export function PostEditor({
  disabled,
  initialJson,
  onChange,
  toolbarEnd,
  embedded = false,
}: PostEditorProps) {
  const linkFieldId = useId();
  const linkPanelRef = useRef<HTMLDivElement>(null);
  const linkToggleRef = useRef<HTMLButtonElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Superscript,
      Spoiler,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "gn-post-editor-link",
        },
      }),
    ],
    editable: !disabled,
    content: safeInitial(initialJson ?? undefined),
    editorProps: {
      attributes: {
        class:
          "gn-post-editor-prose gn-post-editor-surface max-w-none min-h-[220px] px-3 py-3 text-[15px] leading-relaxed text-[var(--gn-text)] focus:outline-none",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON() as Record<string, unknown>;
      const html = sanitizeEditorHtml(ed.getHTML());
      onChange?.({ json, html });
    },
  });

  useEffect(() => {
    if (!editor || !onChange) return;
    onChange({
      json: editor.getJSON() as Record<string, unknown>,
      html: sanitizeEditorHtml(editor.getHTML()),
    });
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (disabled) setLinkOpen(false);
  }, [disabled]);

  const openLinkPanel = useCallback(() => {
    if (!editor || disabled) return;
    const href = editor.getAttributes("link").href;
    setLinkDraft(typeof href === "string" ? href : "");
    setLinkOpen(true);
  }, [editor, disabled]);

  const closeLinkPanel = useCallback(() => {
    setLinkOpen(false);
    setLinkDraft("");
  }, []);

  useEffect(() => {
    if (!linkOpen) return;
    const t = window.setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 0);
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (linkPanelRef.current?.contains(t)) return;
      if (linkToggleRef.current?.contains(t)) return;
      closeLinkPanel();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLinkPanel();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [linkOpen, closeLinkPanel]);

  const applyLink = useCallback(() => {
    if (!editor || disabled) return;
    const normalized = normalizeLinkHref(linkDraft);
    if (!normalized) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      closeLinkPanel();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
    closeLinkPanel();
  }, [editor, disabled, linkDraft, closeLinkPanel]);

  const removeLink = useCallback(() => {
    if (!editor || disabled) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkPanel();
  }, [editor, disabled, closeLinkPanel]);

  const can = !disabled && !!editor;
  const e = editor;

  const shellClass = embedded
    ? "overflow-hidden rounded-lg"
    : "overflow-hidden rounded-xl border border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] shadow-[var(--gn-shadow-sm)]";

  return (
    <div className={shellClass}>
      <div className="border-b border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-2 py-2">
          <div className="flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              title="Undo — Ctrl+Z"
              aria-label="Undo"
              disabled={!can || !e?.can().undo()}
              className={toolClass(false, !!(can && e?.can().undo()))}
              onClick={() => e?.chain().focus().undo().run()}
            >
              <IconUndo />
            </button>
            <button
              type="button"
              title="Redo — Ctrl+Shift+Z"
              aria-label="Redo"
              disabled={!can || !e?.can().redo()}
              className={toolClass(false, !!(can && e?.can().redo()))}
              onClick={() => e?.chain().focus().redo().run()}
            >
              <IconRedo />
            </button>
            <ToolbarDivider />
            <button
              type="button"
              title="Bold — Ctrl+B"
              aria-label="Bold"
              aria-pressed={e?.isActive("bold") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("bold") ?? false, can)}
              onClick={() => e?.chain().focus().toggleBold().run()}
            >
              <strong className="text-xs">B</strong>
            </button>
            <button
              type="button"
              title="Italic — Ctrl+I"
              aria-label="Italic"
              aria-pressed={e?.isActive("italic") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("italic") ?? false, can)}
              onClick={() => e?.chain().focus().toggleItalic().run()}
            >
              <em className="text-xs">I</em>
            </button>
            <button
              type="button"
              title="Strikethrough"
              aria-label="Strikethrough"
              aria-pressed={e?.isActive("strike") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("strike") ?? false, can)}
              onClick={() => e?.chain().focus().toggleStrike().run()}
            >
              <s className="text-xs">S</s>
            </button>
            <button
              type="button"
              title="Superscript"
              aria-label="Superscript"
              aria-pressed={e?.isActive("superscript") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("superscript") ?? false, can)}
              onClick={() => e?.chain().focus().toggleSuperscript().run()}
            >
              <span className="text-xs font-medium">x²</span>
            </button>
            <button
              type="button"
              title="Inline code"
              aria-label="Inline code"
              aria-pressed={e?.isActive("code") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("code") ?? false, can)}
              onClick={() => e?.chain().focus().toggleCode().run()}
            >
              <code className="text-[11px]">&lt;/&gt;</code>
            </button>
            <ToolbarDivider />
            <button
              type="button"
              title="Bullet list"
              aria-label="Bullet list"
              aria-pressed={e?.isActive("bulletList") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("bulletList") ?? false, can)}
              onClick={() => e?.chain().focus().toggleBulletList().run()}
            >
              <IconListBullet />
            </button>
            <button
              type="button"
              title="Numbered list"
              aria-label="Numbered list"
              aria-pressed={e?.isActive("orderedList") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("orderedList") ?? false, can)}
              onClick={() => e?.chain().focus().toggleOrderedList().run()}
            >
              <IconListOrdered />
            </button>
            <ToolbarDivider />
            <button
              type="button"
              title="Quote"
              aria-label="Quote"
              aria-pressed={e?.isActive("blockquote") ?? false}
              disabled={!can}
              className={toolClass(e?.isActive("blockquote") ?? false, can)}
              onClick={() => e?.chain().focus().toggleBlockquote().run()}
            >
              <IconQuote />
            </button>
            <button
              type="button"
              title="Spoiler — hidden until tapped on the post"
              aria-label="Spoiler"
              aria-pressed={e?.isActive("spoiler") ?? false}
              disabled={!can}
              className={`${toolClass(e?.isActive("spoiler") ?? false, can)} px-2.5 font-semibold tracking-widest`}
              onClick={() => e?.chain().focus().toggleMark("spoiler").run()}
            >
              <span className="text-[10px]">···</span>
            </button>
            <button
              ref={linkToggleRef}
              type="button"
              title={
                linkOpen
                  ? "Close link editor"
                  : "Add or edit link — select text first"
              }
              aria-label="Link"
              aria-expanded={linkOpen}
              aria-pressed={linkOpen || (e?.isActive("link") ?? false)}
              disabled={!can}
              className={toolClass(
                !!(linkOpen || e?.isActive("link")),
                can,
              )}
              onClick={() => {
                if (linkOpen) closeLinkPanel();
                else openLinkPanel();
              }}
            >
              <IconLink />
            </button>
          </div>
          {toolbarEnd ? (
            <div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-[var(--gn-divide)] pt-1.5 sm:border-t-0 sm:pt-0">
              {toolbarEnd}
            </div>
          ) : null}
        </div>

        {linkOpen ? (
          <div
            ref={linkPanelRef}
            className="border-t border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_88%,var(--gn-surface-elevated))] px-3 py-3"
            role="region"
            aria-label="Link editor"
          >
            <label
              htmlFor={linkFieldId}
              className="text-xs font-medium text-[var(--gn-text)]"
            >
              Link URL
            </label>
            <p className="mt-0.5 text-[11px] text-[var(--gn-text-muted)]">
              Select text in the editor, then paste or type a full URL (https is
              added automatically). Leave blank and apply to remove a link.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={linkInputRef}
                id={linkFieldId}
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://example.com"
                value={linkDraft}
                disabled={!can}
                onChange={(ev) => setLinkDraft(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    applyLink();
                  }
                }}
                className="gn-input min-w-0 flex-1 px-3 py-2 text-sm"
              />
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!can}
                  className="rounded-lg bg-[#ff4500] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_12px_rgba(255,69,0,0.25)] transition hover:bg-[#ff5414] disabled:opacity-50"
                  onClick={() => applyLink()}
                >
                  {linkDraft.trim() ? "Apply link" : "Remove link"}
                </button>
                {e?.isActive("link") ? (
                  <button
                    type="button"
                    disabled={!can}
                    className="rounded-lg border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                    onClick={() => removeLink()}
                  >
                    Unlink
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!can}
                  className="rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                  onClick={() => closeLinkPanel()}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
