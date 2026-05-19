"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CommunityIcon } from "@/components/community-icon";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey?: string | null;
  memberCount?: number | null;
};

function formatMemberCount(count: number | null | undefined): string {
  if (!count || count < 1) return "New community";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k members`;
  return `${count} member${count === 1 ? "" : "s"}`;
}

export default function WelcomePage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(1);

  useEffect(() => {
    apiFetch<Community[]>("/communities?limit=8")
      .then((data) => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleJoin = async (community: Community) => {
    if (joined.has(community.id) || busy.has(community.id)) return;
    setBusy((b) => new Set(b).add(community.id));
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        toast.error("Please sign in to join communities.");
        return;
      }
      await apiFetch(`/communities/${community.slug}/join`, {
        method: "POST",
        token,
      });
      setJoined((j) => new Set(j).add(community.id));
      toast.success(`Joined ${community.name}!`);
    } catch {
      toast.error("Could not join — try again.");
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(community.id);
        return next;
      });
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`h-2 rounded-full transition-all ${
              s === step
                ? "w-8 bg-[var(--gn-accent)]"
                : s < step
                  ? "w-2 bg-[var(--gn-accent)]/50"
                  : "w-2 bg-[var(--gn-divide)]"
            }`}
            aria-label={`Step ${s}`}
          />
        ))}
      </div>

      {/* Step 1: Welcome hero */}
      {step === 1 && (
        <div className="text-center">
          <div className="mb-4 text-6xl">🌱</div>
          <h1 className="mb-3 text-3xl font-bold text-[var(--gn-text)]">
            Welcome to Growers Notebook!
          </h1>
          <p className="mb-8 text-[var(--gn-text-muted)]">
            A home for growers to share grows, swap tips, and build together.
            Let&apos;s get you set up in 3 quick steps.
          </p>
          <div className="mb-8 grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                icon: "🌍",
                title: "Follow Communities",
                desc: "Get a feed filled with content you actually care about.",
              },
              {
                icon: "📓",
                title: "Start a Notebook",
                desc: "Document your grow week-by-week with photos and metrics.",
              },
              {
                icon: "💬",
                title: "Join Conversations",
                desc: "Post, comment, vote — every grower has something to share.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-4"
              >
                <div className="mb-2 text-3xl">{item.icon}</div>
                <p className="mb-1 font-semibold text-[var(--gn-text)]">
                  {item.title}
                </p>
                <p className="text-xs leading-relaxed text-[var(--gn-text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-full bg-[var(--gn-accent)] px-8 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
          >
            Get started →
          </button>
        </div>
      )}

      {/* Step 2: Follow communities */}
      {step === 2 && (
        <div>
          <h1 className="mb-1 text-2xl font-bold text-[var(--gn-text)]">
            Follow communities you love
          </h1>
          <p className="mb-6 text-sm text-[var(--gn-text-muted)]">
            Your feed will fill up with their posts. You can always join more
            later.
          </p>
          {communities.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {communities.map((c) => {
                const isJoined = joined.has(c.id);
                const isBusy = busy.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={`gn-card flex items-center gap-4 p-4 transition ${isJoined ? "ring-1 ring-[var(--gn-accent)]/40" : ""}`}
                  >
                    <CommunityIcon
                      iconKey={c.iconKey}
                      nameFallback={c.name}
                      slugFallback={c.slug}
                      frameClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--gn-text)]">
                        {c.name}
                      </p>
                      <p className="text-xs text-[var(--gn-text-muted)]">
                        {formatMemberCount(c.memberCount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleJoin(c)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                        isJoined
                          ? "border border-[var(--gn-accent)]/40 bg-[var(--gn-accent)]/10 text-[var(--gn-accent)]"
                          : "bg-[var(--gn-accent)] text-white hover:brightness-110"
                      }`}
                    >
                      {isBusy ? "…" : isJoined ? "✓ Joined" : "Join"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--gn-text-muted)]">
              Loading communities…
            </p>
          )}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-[var(--gn-text-muted)] hover:text-[var(--gn-text)]"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-full bg-[var(--gn-accent)] px-6 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Start a notebook or go to feed */}
      {step === 3 && (
        <div className="text-center">
          <div className="mb-4 text-6xl">📓</div>
          <h1 className="mb-3 text-2xl font-bold text-[var(--gn-text)]">
            Ready to grow?
          </h1>
          <p className="mb-8 text-[var(--gn-text-muted)]">
            A grow notebook lets you document every week of your plant&apos;s
            life — photos, measurements, notes. Your community can follow along
            and cheer you on.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/notebooks/new"
              className="w-full rounded-full bg-[var(--gn-accent)] px-8 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 sm:w-auto"
            >
              🌿 Start my first notebook
            </Link>
            <Link
              href="/"
              className="w-full rounded-full border border-[var(--gn-divide)] px-8 py-3 text-sm font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] sm:w-auto"
            >
              Go to my feed →
            </Link>
          </div>
          <p className="mt-6 text-xs text-[var(--gn-text-muted)]">
            You can always start a notebook later from the sidebar.
          </p>
        </div>
      )}
    </main>
  );
}
