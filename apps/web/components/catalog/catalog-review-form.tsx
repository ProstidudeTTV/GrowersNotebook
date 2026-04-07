"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { InteractiveStarRating } from "@/components/catalog/interactive-star-rating";

export type CatalogReviewMediaInput = { url: string; type: string };

function isHttpsImageUrl(s: string): boolean {
  const t = s.trim();
  if (!t.startsWith("https://")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function CatalogReviewForm({
  entity,
  slug,
  initialRating,
  initialBody,
  initialMedia,
  disabled,
  disabledMessage,
}: {
  entity: "strain" | "breeder";
  slug: string;
  initialRating?: string | null;
  initialBody?: string | null;
  /** Strain reviews only; breeder reviews ignore. */
  initialMedia?: CatalogReviewMediaInput[] | null;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(
    initialRating != null ? Number(initialRating) : 4,
  );
  const [body, setBody] = useState(initialBody ?? "");
  const initialUrls =
    entity === "strain" && initialMedia?.length
      ? initialMedia
          .filter((m) => m.type === "image" && m.url?.trim())
          .map((m) => m.url.trim())
          .slice(0, 8)
      : [];
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialUrls.length ? initialUrls : [""],
  );
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
      const urls = imageUrls
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, 8);
      const bad = urls.find((u) => !isHttpsImageUrl(u));
      if (bad) {
        setError("Each image URL must start with https://");
        setSaving(false);
        return;
      }
      const payload: {
        rating: number;
        body: string;
        media?: CatalogReviewMediaInput[];
      } = { rating, body };
      if (entity === "strain" && urls.length > 0) {
        payload.media = urls.map((url) => ({ url, type: "image" as const }));
      }
      await apiFetch(path, {
        method: "PUT",
        body: JSON.stringify(payload),
        token,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  function addImageField() {
    if (imageUrls.length >= 8) return;
    setImageUrls((prev) => [...prev, ""]);
  }

  function removeImageField(i: number) {
    setImageUrls((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length === 0 ? [""] : next;
    });
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
          Your rating
        </label>
        <div className="mt-2">
          <InteractiveStarRating value={rating} onChange={setRating} />
        </div>
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
      {entity === "strain" ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Photos (optional, https image URLs, max 8)
            </label>
            {imageUrls.length < 8 ? (
              <button
                type="button"
                onClick={addImageField}
                className="text-xs font-medium text-[#ff6a38] hover:underline"
              >
                Add URL
              </button>
            ) : null}
          </div>
          <ul className="mt-2 space-y-2">
            {imageUrls.map((url, i) => (
              <li key={i} className="flex gap-2">
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) =>
                    setImageUrls((prev) =>
                      prev.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                  className="min-w-0 flex-1 rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1 text-sm text-[var(--gn-text)]"
                />
                {imageUrls.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeImageField(i)}
                    className="shrink-0 rounded border border-[var(--gn-divide)] px-2 py-1 text-xs text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)]"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
