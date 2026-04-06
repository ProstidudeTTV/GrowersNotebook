import Link from "next/link";
import { UserProfileLink } from "@/components/user-profile-link";

export type ProfileCommentRow = {
  id: string;
  postId: string;
  postTitle: string;
  community: { slug: string; name: string } | null;
  body: string;
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
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] px-4 py-6 text-sm text-[var(--gn-text-muted)]">
        No comments yet.
      </p>
    );
  }

  return (
    <ul className="gn-panel divide-y divide-[var(--gn-divide)] overflow-hidden">
      {items.map((c) => (
        <li key={c.id} className="gn-list-row p-4">
          <p className="text-sm text-[var(--gn-text)]">{excerpt(c.body)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--gn-text-muted)]">
            <span className="font-medium text-[var(--gn-text)]">
              on{" "}
              <Link
                href={`/p/${c.postId}#comment-${c.id}`}
                className="text-[#ff4500] hover:underline"
              >
                {c.postTitle}
              </Link>
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
      ))}
    </ul>
  );
}
