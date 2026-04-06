"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";

export function CatalogReviewForm({
  entity,
  slug,
  initialRating,
  initialBody,
  disabled,
  disabledMessage,
}: {
  entity: "strain" | "breeder";
  slug: string;
  initialRating?: string | null;
  initialBody?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(
    initialRating != null ? Number(initialRating) : 4,
  );
  const [body, setBody] = useState(initialBody ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired — sign in again.");
        setSaving(false);
        return;
      }
      const path =
        entity === "strain"
          ? `/strains/${encodeURIComponent(slug)}/reviews`
          : `/breeders/${encodeURIComponent(slug)}/reviews`;
      await apiFetch(path, {
        method: "PUT",
        body: JSON.stringify({ rating, body }),
        token,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-3 py-2 text-sm text-[var(--gn-text-muted)]">
        {disabledMessage ?? "Sign in to leave a review."}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-4">
      <div>
        <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
          Your rating (1–5)
        </label>
        <input
          type="number"
          min={1}
          max={5}
          step={0.1}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="mt-1 w-full max-w-[8rem] rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1 text-[var(--gn-text)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
          Review (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1 text-sm text-[var(--gn-text)]"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#ff6a38] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff7d4c] disabled:opacity-50"
      >
        {saving ? "Saving…" : initialRating != null ? "Update review" : "Post review"}
      </button>
    </form>
  );
}
