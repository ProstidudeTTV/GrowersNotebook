"use client";

import Link from "next/link";
import { useState } from "react";
import { DmImageLightbox } from "@/components/dm-image-lightbox";
import { StackedDmStyleImages } from "@/components/stacked-dm-style-images";
import { UserProfileLink } from "@/components/user-profile-link";

export type ProfileCommentRow = {
  id: string;
  kind?: "post" | "notebook";
  postId?: string;
  postTitle?: string;
  notebookId?: string;
  notebookTitle?: string;
  community: { slug: string; name: string } | null;
  body: string;
  imageUrls?: string[];
  createdAt: string;
  score: number;
};

function excerpt(body: string, max = 200) {
  const t = body.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function ProfileCommentsList({
  items,
  profileUserId,
  profileLabel,
}: {
  items: ProfileCommentRow[];
  profileUserId: string;
  profileLabel: string;
}) {
  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] px-4 py-6 text-sm text-[var(--gn-text-muted)]">
        No comments yet.
      </p>
    );
  }

  return (
    <>
      {lightbox ? (
        <DmImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}
      <ul className="gn-panel divide-y divide-[var(--gn-divide)] overflow-hidden">
        {items.map((c) => {
          const imgs = c.imageUrls?.filter(Boolean) ?? [];
          const preview = excerpt(c.body);
          return (
            <li key={c.id} className="gn-list-row p-4">
              {preview ? (
                <p className="text-sm text-[var(--gn-text)]">{preview}</p>
              ) : null}
              {imgs.length > 0 ? (
                <div className="mt-2">
                  <StackedDmStyleImages
                    urls={imgs}
                    stackKey={c.id}
                    pileLabel={imgs.length > 1 ? `${imgs.length} photos` : null}
                    compact
                    onOpen={(index) =>
                      setLightbox({ urls: imgs, index })
                    }
                  />
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--gn-text-muted)]">
                <span className="font-medium text-[var(--gn-text)]">
                  on{" "}
                  {c.notebookId ? (
                    <Link
                      href={`/notebooks/${encodeURIComponent(c.notebookId)}#comments`}
                      className="text-[#ff4500] hover:underline"
                    >
                      {c.notebookTitle?.trim() || "Grow diary"}
                    </Link>
                  ) : (
                    <Link
                      href={`/p/${c.postId}#comment-${c.id}`}
                      className="text-[#ff4500] hover:underline"
                    >
                      {c.postTitle}
                    </Link>
                  )}
                </span>
                {c.community ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/community/${c.community.slug}`}
                      className="font-semibold text-[#ff4500] hover:underline"
                    >
                      {c.community.name.trim() || c.community.slug}
                    </Link>
                  </>
                ) : (
                  <>
                    <span aria-hidden>·</span>
                    <UserProfileLink
                      userId={profileUserId}
                      className="font-semibold text-[#ff4500] hover:underline"
                    >
                      {profileLabel}
                    </UserProfileLink>
                  </>
                )}
                <span aria-hidden>·</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
                <span aria-hidden>·</span>
                <span>{c.score} pts</span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
