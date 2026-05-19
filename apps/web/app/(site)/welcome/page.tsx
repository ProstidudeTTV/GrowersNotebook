import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api-public";
import { CommunityIcon } from "@/components/community-icon";

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey?: string | null;
  memberCount?: number | null;
};

function formatMemberCount(count: number | null | undefined): string {
  if (!count || count < 1) return "0 members";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k members`;
  return `${count} member${count === 1 ? "" : "s"}`;
}

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let communities: Community[] = [];
  try {
    const data = await apiFetch<Community[]>("/communities?limit=6", {
      timeoutMs: 5000,
    });
    communities = Array.isArray(data) ? data : [];
  } catch {
    // Non-fatal — page still renders without communities
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Celebratory hero */}
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-[var(--gn-text)] mb-3">
          You&apos;re in, grower!
        </h1>
        <p className="text-[var(--gn-text-muted)]">
          Welcome to the community. Let&apos;s get you set up.
        </p>
      </div>

      {/* Follow some communities */}
      {communities.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[var(--gn-text)] mb-1">
            Follow some communities
          </h2>
          <p className="text-sm text-[var(--gn-text-muted)] mb-4">
            Join the conversations that matter to you.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {communities.map((c) => (
              <div
                key={c.id}
                className="gn-card flex items-center gap-4 p-4"
              >
                <CommunityIcon
                  iconKey={c.iconKey}
                  nameFallback={c.name}
                  slugFallback={c.slug}
                  frameClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--gn-text)] truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-[var(--gn-text-muted)]">
                    {formatMemberCount(c.memberCount)}
                  </p>
                </div>
                <Link
                  href={`/community/${c.slug}`}
                  className="shrink-0 rounded-full bg-[#ff4500] px-3 py-1 text-xs font-semibold text-white shadow-[0_0_12px_rgba(255,69,0,0.3)] transition hover:bg-[#ff5414] hover:shadow-[0_0_20px_rgba(255,69,0,0.4)]"
                >
                  Join
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skip */}
      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] transition"
        >
          Skip for now →
        </Link>
      </div>
    </main>
  );
}
