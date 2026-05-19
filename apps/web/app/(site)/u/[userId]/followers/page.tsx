import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-public";
import { isUuid } from "@/lib/is-uuid";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

type FollowRow = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
};

type ListResponse = {
  items: FollowRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  if (!isUuid(userId)) return { title: "Followers" };
  try {
    const profile = await apiFetch<{ displayName: string | null }>(
      `/profiles/${userId}`,
      { timeoutMs: 8000 },
    );
    const name = profile.displayName?.trim() || "Grower";
    return {
      title: `${name}'s followers`,
      alternates: { canonical: canonicalPath(`/u/${userId}/followers`) },
    };
  } catch {
    return { title: "Followers" };
  }
}

export default async function ProfileFollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;

  let profileName = "Grower";
  try {
    const profile = await apiFetch<{ displayName: string | null }>(
      `/profiles/${userId}`,
    );
    profileName = profile.displayName?.trim() || "Grower";
  } catch {
    notFound();
  }

  let list: ListResponse = { items: [], total: 0, page: 1, pageSize: 30 };
  try {
    list = await apiFetch<ListResponse>(
      `/follows/users/${userId}/followers?page=${page}&pageSize=30`,
    );
  } catch {
    list = { items: [], total: 0, page, pageSize: 30 };
  }

  const profileHref = `/u/${userId}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={profileHref}
        className="text-sm text-[var(--gn-accent)] hover:underline"
      >
        ← {profileName}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--gn-text)]">
        Followers
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        {list.total.toLocaleString()} grower{list.total === 1 ? "" : "s"} follow{" "}
        {profileName} on {SITE_NAME}.
      </p>

      {list.items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[var(--gn-text-muted)]">
          No followers yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.items.map((row) => {
            const label = row.displayName?.trim() || "Grower";
            return (
              <li key={row.id}>
                <Link
                  href={`/u/${row.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] px-4 py-3 transition hover:border-[var(--gn-accent)]/30 hover:shadow-[var(--gn-shadow-sm)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gn-accent)]/15 text-sm font-bold text-[var(--gn-accent)]">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      label.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-[var(--gn-text)] truncate">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {list.total > list.pageSize ? (
        <div className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={`/u/${userId}/followers?page=${page - 1}`}
              className="text-[var(--gn-accent)] hover:underline"
            >
              ← Previous
            </Link>
          ) : null}
          {page * list.pageSize < list.total ? (
            <Link
              href={`/u/${userId}/followers?page=${page + 1}`}
              className="text-[var(--gn-accent)] hover:underline"
            >
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
