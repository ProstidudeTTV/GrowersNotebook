"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { PostMediaDropzone } from "@/components/post-media-dropzone";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";

const STEPS = 3;
const MAX_IMAGES = 8;

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

const fieldShell =
  "w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-4 text-sm leading-snug text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40";

const inputClass = `${fieldShell} py-2.5 min-h-[2.75rem]`;

const textareaClass = `${fieldShell} py-3`;

export function NotebookHarvestWizard({
  open,
  notebook,
  notebookId,
  onClose,
  onSaved,
}: {
  open: boolean;
  notebook: NotebookDetailPayload;
  notebookId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [harvestDryWeightG, setHarvestDryWeightG] = useState("");
  const [harvestQualityNotes, setHarvestQualityNotes] = useState("");
  const [plantCount, setPlantCount] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [markCompleted, setMarkCompleted] = useState(false);

  const filledImageSlots = useMemo(
    () => imageUrls.map((s) => s.trim()).filter(Boolean).length,
    [imageUrls],
  );
  const remainingImageSlots = MAX_IMAGES - filledImageSlots;

  const appendUploadedImage = useCallback((url: string) => {
    const t = url.trim();
    if (!t) return;
    setImageUrls((prev) => {
      const core = prev.map((s) => s.trim()).filter(Boolean);
      if (core.includes(t) || core.length >= MAX_IMAGES) return prev;
      const next = [...core, t];
      return next.length < MAX_IMAGES ? [...next, ""] : next;
    });
    setUploadError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    setUploadError(null);
    setSaving(false);
    setHarvestDryWeightG(notebook.harvestDryWeightG ?? "");
    setHarvestQualityNotes(notebook.harvestQualityNotes ?? "");
    setPlantCount(
      notebook.plantCount != null ? String(notebook.plantCount) : "",
    );
    const hi = notebook.harvestImageUrls?.filter(Boolean) ?? [];
    setImageUrls(hi.length ? [...hi, ""] : [""]);
    setMarkCompleted(notebook.status === "completed");
  }, [open, notebook]);

  function addImageField() {
    if (imageUrls.length >= MAX_IMAGES) return;
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
    const urls = imageUrls
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, MAX_IMAGES);
    const bad = urls.find((u) => !isHttpsImageUrl(u));
    if (bad) {
      setError("Each image URL must start with https://");
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to save.");

      const pc = plantCount.trim();
      const payload: Record<string, unknown> = {
        harvestDryWeightG: harvestDryWeightG.trim() || null,
        harvestQualityNotes: harvestQualityNotes.trim() || null,
        harvestImageUrls: urls,
        growthStage: "harvest",
        ...(markCompleted ? { status: "completed" } : {}),
      };
      if (pc !== "") {
        const n = Number.parseInt(pc, 10);
        if (Number.isFinite(n) && n >= 0) payload.plantCount = n;
      }

      await apiFetch(`/notebooks/${notebookId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save harvest");
    } finally {
      setSaving(false);
    }
  }

  const stepTitle = ["Harvest details", "Harvest photos", "Review"][step - 1];

  return (
    <NotebookCenteredModal
      open={open}
      title="Harvest log"
      onClose={() => (!saving ? onClose() : undefined)}
      maxWidthClassName="max-w-[min(40rem,calc(100vw-1.5rem))]"
    >
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-5">
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
          <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--gn-text-muted)]">
            Step {step} of {STEPS}: {stepTitle}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-[var(--gn-text-muted)]">
              Log dry weight, quality, and plant count for readers and g/W
              stats. You can update this anytime while the notebook is in harvest.
            </p>
            <div>
              <label className="text-sm font-semibold text-[var(--gn-text)]">
                Dry weight (g)
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={harvestDryWeightG}
                onChange={(e) => setHarvestDryWeightG(e.target.value)}
                inputMode="decimal"
                placeholder="Cured dry weight"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gn-text)]">
                Plant count
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={plantCount}
                onChange={(e) => setPlantCount(e.target.value)}
                inputMode="numeric"
                placeholder={notebook.plantCount != null ? String(notebook.plantCount) : "—"}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gn-text)]">
                Quality & trim notes
              </label>
              <textarea
                className={`${textareaClass} mt-1`}
                rows={5}
                value={harvestQualityNotes}
                onChange={(e) => setHarvestQualityNotes(e.target.value)}
                placeholder="Density, smell, trimming, cure notes…"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--gn-text)]">
              <input
                type="checkbox"
                className="mt-1"
                checked={markCompleted}
                onChange={(e) => setMarkCompleted(e.target.checked)}
              />
              <span>Mark notebook as completed (status)</span>
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="text-sm text-[var(--gn-text-muted)]">
              Add harvest photos like forum posts (tap or drag), or paste https
              links. Videos are not attached to harvest galleries.
            </p>
            <div className="mt-4">
              <PostMediaDropzone
                disabled={saving || remainingImageSlots <= 0}
                onMediaReady={(url, kind) => {
                  if (kind === "video") {
                    setUploadError(
                      "Harvest photos support images only, not video files.",
                    );
                    return;
                  }
                  appendUploadedImage(url);
                }}
                onError={(msg) => setUploadError(msg)}
              />
              {uploadError ? (
                <p className="mt-2 text-xs text-red-400">{uploadError}</p>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end">
              {imageUrls.length < MAX_IMAGES ? (
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-xs font-medium text-emerald-500 hover:underline"
                >
                  Add URL field
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
                    className={`min-w-0 flex-1 ${inputClass}`}
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

        {step === 3 ? (
          <ul className="space-y-2 text-sm text-[var(--gn-text-muted)]">
            <li>
              <span className="font-medium text-[var(--gn-text)]">Dry g:</span>{" "}
              {harvestDryWeightG.trim() || "—"}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">
                Plants:
              </span>{" "}
              {plantCount.trim() ||
                (notebook.plantCount != null ? String(notebook.plantCount) : "—")}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">Notes:</span>{" "}
              {harvestQualityNotes.trim()
                ? `${harvestQualityNotes.trim().slice(0, 140)}${harvestQualityNotes.trim().length > 140 ? "…" : ""}`
                : "—"}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">Photos:</span>{" "}
              {imageUrls.map((u) => u.trim()).filter(Boolean).length}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">Status:</span>{" "}
              {markCompleted ? "Completed" : "Active / keep updating"}
            </li>
          </ul>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--gn-divide)] pt-4">
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
              disabled={saving}
              onClick={() => setStep((s) => Math.min(STEPS, s + 1))}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              Next <span aria-hidden>›</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              {saving ? "Saving…" : "Save harvest"}
            </button>
          )}
        </div>
      </div>
    </NotebookCenteredModal>
  );
}
