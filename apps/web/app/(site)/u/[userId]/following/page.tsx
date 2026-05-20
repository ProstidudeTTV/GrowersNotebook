import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SitePageShell } from "@/components/site-page-shell";
import { apiFetch } from "@/lib/api-public";
import { isUuid } from "@/lib/is-uuid";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
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
  hidden?: boolean;
  hiddenReason?: "private_lists" | "private_profile";
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  if (!isUuid(userId)) return { title: "Following" };
  try {
    const profile = await apiFetch<{ displayName: string | null }>(
      `/profiles/${userId}`,
      { timeoutMs: 8000 },
    );
    const name = profile.displayName?.trim() || "Grower";
    return {
      title: `${name} is following`,
      alternates: { canonical: canonicalPath(`/u/${userId}/following`) },
    };
  } catch {
    return { title: "Following" };
  }
}

export default async function ProfileFollowingPage({
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

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  const viewerId = token
    ? (
        await supabase.auth.getUser()
      ).data.user?.id ?? null
    : null;
  const isOwner = viewerId === userId;

  let profileName = "Grower";
  try {
    const profile = await apiFetch<{ displayName: string | null }>(
      `/profiles/${userId}`,
      { token: token ?? undefined },
    );
    profileName = profile.displayName?.trim() || "Grower";
  } catch {
    notFound();
  }

  let list: ListResponse = { items: [], total: 0, page: 1, pageSize: 30 };
  let loadFailed = false;
  try {
    list = await apiFetch<ListResponse>(
      `/follows/users/${userId}/following?page=${page}&pageSize=30`,
      { token: token ?? undefined },
    );
  } catch {
    loadFailed = true;
    list = { items: [], total: 0, page, pageSize: 30 };
  }

  const profileHref = `/u/${userId}`;

  return (
    <SitePageShell>
      <main className="mx-auto max-w-2xl py-8">
        <Link
          href={profileHref}
          className="text-sm text-[var(--gn-accent)] hover:underline"
        >
          ← {profileName}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--gn-text)]">
          Following
        </h1>
        <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
          {list.hidden
            ? isOwner
              ? "Your following list is private — only you can see it."
              : "This grower keeps their following list private."
            : `${profileName} follows ${list.total.toLocaleString()} grower${list.total === 1 ? "" : "s"} on ${SITE_NAME}.`}
        </p>

        {loadFailed ? (
          <p className="mt-10 text-center text-sm text-[var(--gn-text-muted)]">
            Could not load following list right now. Try again later.
          </p>
        ) : list.hidden ? null : list.items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--gn-text-muted)]">
            Not following anyone yet.
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
                    <span className="min-w-0 flex-1 truncate font-semibold text-[var(--gn-text)]">
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!list.hidden && list.total > list.pageSize ? (
          <div className="mt-6 flex justify-center gap-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/u/${userId}/following?page=${page - 1}`}
                className="text-[var(--gn-accent)] hover:underline"
              >
                ← Previous
              </Link>
            ) : null}
            {page * list.pageSize < list.total ? (
              <Link
                href={`/u/${userId}/following?page=${page + 1}`}
                className="text-[var(--gn-accent)] hover:underline"
              >
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </main>
    </SitePageShell>
  );
}
