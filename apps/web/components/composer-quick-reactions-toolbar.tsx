"use client";

import type { ReactNode } from "react";
import { FullEmojiPickerButton } from "@/components/full-emoji-picker-button";
import { COMMENT_EMOJI_QUICK } from "@/lib/comment-emoji-quick";

/**
 * Shared “reaction strip” for comment and DM composers (compact, pill-style).
 */
export function ComposerQuickReactionsToolbar({
  disabled,
  onEmojiAppend,
  gifSlot,
}: {
  disabled: boolean;
  onEmojiAppend: (emoji: string) => void;
  gifSlot: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/90 px-1 py-0.5 shadow-[var(--gn-shadow-sm)] backdrop-blur-sm"
        role="group"
        aria-label="Quick reactions"
      >
        {COMMENT_EMOJI_QUICK.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[1.15rem] leading-none text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            title={emoji}
            onClick={() => onEmojiAppend(emoji)}
          >
            {emoji}
          </button>
        ))}
        <FullEmojiPickerButton
          disabled={disabled}
          ariaLabel="More emojis"
          onPick={onEmojiAppend}
          showLabel={false}
        />
      </div>
      {gifSlot}
    </div>
  );
}
