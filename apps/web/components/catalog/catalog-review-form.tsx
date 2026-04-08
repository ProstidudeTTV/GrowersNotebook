"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import {
  CatalogOverallStarRow,
  CatalogOptionalSubStarRow,
} from "@/components/catalog/interactive-star-rating";
import {
  ALL_CATALOG_SUB_RATING_KEYS,
  CATALOG_SUB_RATING_ROWS,
  catalogSubRatingLabel,
  catalogSubRatingsFromApi,
  toSubRatingsPayload,
  type CatalogSubRatingKey,
} from "@/lib/catalog-sub-ratings-meta";

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

function roundOverallFromApi(r: string | null | undefined): number | null {
  if (r == null || r === "") return null;
  const n = Number(r);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

const STEPS = 4;

export function CatalogReviewForm({
  entity,
  slug,
  initialRating,
  initialBody,
  initialSubRatings,
  initialMedia,
  disabled,
  disabledMessage,
}: {
  entity: "strain" | "breeder";
  slug: string;
  initialRating?: string | null;
  initialBody?: string | null;
  /** Optional 1–5 scores saved with the review. */
  initialSubRatings?: Record<string, unknown> | null;
  /** Strain reviews only; breeder reviews ignore. */
  initialMedia?: CatalogReviewMediaInput[] | null;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [overall, setOverall] = useState<number | null>(() =>
    roundOverallFromApi(initialRating ?? null),
  );
  const [subs, setSubs] = useState(() =>
    catalogSubRatingsFromApi(initialSubRatings ?? null),
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

  const isEditing = initialRating != null;

  const subPayload = useMemo(() => toSubRatingsPayload(subs), [subs]);

  const canContinue = useMemo(() => {
    if (step === 1) return overall != null;
    return true;
  }, [step, overall]);

  function setSub(key: CatalogSubRatingKey, v: number | null) {
    setSubs((prev) => ({ ...prev, [key]: v }));
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

  async function submit() {
    setError(null);
    if (overall == null) {
      setError("Choose an overall rating first.");
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        subRatings: Record<string, number>;
        media?: CatalogReviewMediaInput[];
      } = {
        rating: overall,
        body: body.trim(),
        subRatings: subPayload,
      };
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

  if (disabled) {
    return (
      <p className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-3 py-2 text-sm text-[var(--gn-text-muted)]">
        {disabledMessage ?? "Sign in to leave a review."}
      </p>
    );
  }

  const stepTitle = [
    "Ratings",
    "Written review",
    entity === "strain" ? "Photos" : "Almost done",
    "Submit",
  ][step - 1];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] text-[var(--gn-text)]">
      <div className="border-b border-[var(--gn-divide)] px-4 py-3">
        <div className="flex gap-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 min-w-0 flex-1 rounded-full transition ${
                step >= i + 1 ? "bg-emerald-500" : "bg-neutral-600/50"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-[var(--gn-text-muted)]">
          Step {step} of {STEPS}: {stepTitle}
        </p>
      </div>

      <div className="px-4 py-5">
        {step === 1 ? (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-[var(--gn-text)]">
                Overall rating{" "}
                <span className="text-red-500" aria-hidden>
                  *
                </span>
              </h3>
              <div className="mt-3">
                <CatalogOverallStarRow value={overall} onChange={setOverall} />
              </div>
              {overall == null ? (
                <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                  Select a rating to continue.
                </p>
              ) : null}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--gn-text)]">
                Optional sub-ratings
              </h3>
              <div className="mt-4 space-y-6">
                {CATALOG_SUB_RATING_ROWS.map((row, ri) => (
                  <div
                    key={ri}
                    className={`grid grid-cols-2 gap-x-4 gap-y-6 ${
                      row.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
                    }`}
                  >
                    {row.map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-xs font-medium text-[var(--gn-text)]">
                          {label}
                        </p>
                        <div className="mt-2">
                          <CatalogOptionalSubStarRow
                            value={subs[key]}
                            onChange={(v) => setSub(key, v)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <label className="block text-sm font-semibold text-[var(--gn-text)]">
              Review
            </label>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Share grow notes, phenotype observations, or anything others
              should know. Optional but encouraged.
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your review…"
              className="mt-3 w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
        ) : null}

        {step === 3 ? (
          entity === "strain" ? (
            <div>
              <label className="block text-sm font-semibold text-[var(--gn-text)]">
                Photos (optional)
              </label>
              <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                Up to eight https image URLs (hosted elsewhere or your own
                storage).
              </p>
              <div className="mt-3 flex justify-end">
                {imageUrls.length < 8 ? (
                  <button
                    type="button"
                    onClick={addImageField}
                    className="text-xs font-medium text-emerald-500 hover:underline"
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
                      className="min-w-0 flex-1 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
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
          ) : (
            <p className="text-sm leading-relaxed text-[var(--gn-text-muted)]">
              Breeder reviews don&apos;t include photo attachments. Continue to
              review your ratings and text, then submit.
            </p>
          )
        ) : null}

        {step === 4 ? (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-[var(--gn-text)]">
              Ready to publish?
            </h3>
            <ul className="space-y-2 text-[var(--gn-text-muted)]">
              <li>
                <span className="font-medium text-[var(--gn-text)]">
                  Overall:
                </span>{" "}
                {overall ?? "—"} / 5
              </li>
              <li>
                <span className="font-medium text-[var(--gn-text)]">
                  Sub-ratings:
                </span>{" "}
                {ALL_CATALOG_SUB_RATING_KEYS.some((k) => subs[k] != null)
                  ? ALL_CATALOG_SUB_RATING_KEYS.filter((k) => subs[k] != null)
                      .map(
                        (k) =>
                          `${catalogSubRatingLabel(k)} ${subs[k]}/5`,
                      )
                      .join(", ")
                  : "None"}
              </li>
              <li>
                <span className="font-medium text-[var(--gn-text)]">
                  Review:
                </span>{" "}
                {body.trim()
                  ? `${body.trim().slice(0, 120)}${body.trim().length > 120 ? "…" : ""}`
                  : "(No text)"}
              </li>
              {entity === "strain" ? (
                <li>
                  <span className="font-medium text-[var(--gn-text)]">
                    Photo URLs:
                  </span>{" "}
                  {
                    imageUrls.map((u) => u.trim()).filter(Boolean).length
                  }
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={step <= 1 || saving}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[var(--gn-text)] disabled:opacity-40"
          >
            <span aria-hidden>‹</span> Back
          </button>
          {step < STEPS ? (
            <button
              type="button"
              disabled={!canContinue || saving}
              onClick={() => setStep((s) => Math.min(STEPS, s + 1))}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              Next <span aria-hidden>›</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || overall == null}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              {saving ? "Saving…" : isEditing ? "Update review" : "Post review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
