"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { NotebookImagePickDropzone } from "@/components/notebook-image-pick-dropzone";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";

const STEPS = 5;
const MAX_IMAGES = 8;

type WeekRow = NotebookDetailPayload["weeks"][number];

type NutLine = { productId: string; customLabel: string; dosage: string };

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

function linesFromWeek(w: WeekRow | null): NutLine[] {
  const list = w?.nutrients ?? [];
  if (!list.length) return [{ productId: "", customLabel: "", dosage: "" }];
  return list.map((n) => ({
    productId: String((n as { productId?: string }).productId ?? ""),
    customLabel: String((n as { customLabel?: string }).customLabel ?? ""),
    dosage: String((n as { dosage?: string }).dosage ?? ""),
  }));
}

function serializeNutrients(lines: NutLine[]) {
  return lines
    .map((line, sortOrder) => ({
      productId: line.productId.trim() ? line.productId.trim() : null,
      customLabel: line.customLabel.trim() || null,
      dosage: line.dosage.trim() || null,
      sortOrder,
    }))
    .filter(
      (l) =>
        l.productId != null ||
        (l.customLabel != null && l.customLabel !== "") ||
        (l.dosage != null && l.dosage !== ""),
    );
}

const inputClass =
  "w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40";

const labelClass = "block text-sm font-semibold text-[var(--gn-text)]";

export function NotebookWeekWizard({
  open,
  notebookId,
  mode,
  existingWeek,
  nextWeekIndex,
  onClose,
  onSaved,
}: {
  open: boolean;
  notebookId: string;
  mode: "create" | "edit";
  existingWeek: WeekRow | null;
  nextWeekIndex: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weekIndex, setWeekIndex] = useState(nextWeekIndex);
  const [notes, setNotes] = useState("");
  const [copyNutrientsFromPreviousWeek, setCopyNutrients] = useState(false);
  const [tempC, setTempC] = useState("");
  const [humidityPct, setHumidityPct] = useState("");
  const [ph, setPh] = useState("");
  const [ec, setEc] = useState("");
  const [ppm, setPpm] = useState("");
  const [lightCycle, setLightCycle] = useState("");
  const [waterNotes, setWaterNotes] = useState("");
  const [nutrientLines, setNutrientLines] = useState<NutLine[]>([
    { productId: "", customLabel: "", dosage: "" },
  ]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    if (mode === "edit" && existingWeek) {
      const w = existingWeek;
      setWeekIndex(w.weekIndex);
      setNotes(w.notes ?? "");
      setCopyNutrients(false);
      setTempC(w.tempC ?? "");
      setHumidityPct(w.humidityPct ?? "");
      setPh(w.ph ?? "");
      setEc(w.ec ?? "");
      setPpm(w.ppm ?? "");
      setLightCycle(w.lightCycle ?? "");
      setWaterNotes(w.waterNotes ?? "");
      setNutrientLines(linesFromWeek(w));
      const urls = (w.imageUrls ?? []).filter(Boolean);
      setImageUrls(urls.length ? urls : [""]);
    } else {
      setWeekIndex(nextWeekIndex);
      setNotes("");
      setCopyNutrients(false);
      setTempC("");
      setHumidityPct("");
      setPh("");
      setEc("");
      setPpm("");
      setLightCycle("");
      setWaterNotes("");
      setNutrientLines([{ productId: "", customLabel: "", dosage: "" }]);
      setImageUrls([""]);
    }
  }, [open, mode, existingWeek, nextWeekIndex]);

  const stepTitle = [
    "Week & notes",
    "Environment",
    "Water & nutrients",
    "Photos",
    "Review",
  ][step - 1];

  const canContinue = useMemo(() => {
    if (step === 1 && mode === "create") {
      return Number.isFinite(weekIndex) && weekIndex >= 1;
    }
    return true;
  }, [step, mode, weekIndex]);

  function addNutrientLine() {
    setNutrientLines((prev) => [
      ...prev,
      { productId: "", customLabel: "", dosage: "" },
    ]);
  }

  function removeNutrientLine(i: number) {
    setNutrientLines((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length ? next : [{ productId: "", customLabel: "", dosage: "" }];
    });
  }

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
      setStep(4);
      return;
    }

    const nutrientsForCreate = copyNutrientsFromPreviousWeek
      ? undefined
      : serializeNutrients(nutrientLines);
    const nutrientsForEdit = serializeNutrients(nutrientLines);

    setSaving(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to save.");

      const shared = {
        notes: notes.trim() || null,
        tempC: tempC.trim() || null,
        humidityPct: humidityPct.trim() || null,
        ph: ph.trim() || null,
        ec: ec.trim() || null,
        ppm: ppm.trim() || null,
        lightCycle: lightCycle.trim() || null,
        waterNotes: waterNotes.trim() || null,
        imageUrls: urls,
      };

      if (mode === "edit" && existingWeek) {
        await apiFetch(`/notebooks/${notebookId}/weeks/${existingWeek.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify({ ...shared, nutrients: nutrientsForEdit }),
        });
      } else {
        await apiFetch(`/notebooks/${notebookId}/weeks`, {
          method: "POST",
          token,
          body: JSON.stringify({
            weekIndex,
            ...shared,
            copyNutrientsFromPreviousWeek: !!copyNutrientsFromPreviousWeek,
            nutrients: nutrientsForCreate,
          }),
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save week");
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === "edit" && existingWeek
      ? `Edit week ${existingWeek.weekIndex}`
      : `Add week ${weekIndex}`;

  return (
    <NotebookCenteredModal
      open={open}
      title={title}
      onClose={() => (!saving ? onClose() : undefined)}
      maxWidthClassName="max-w-4xl"
    >
      <div className="px-4 py-4">
        <div className="mb-4">
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

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--gn-text-muted)]">
              Capture what changed this week—training, defoliation, pests, or
              anything notable.
            </p>
            {mode === "create" ? (
              <div>
                <label className={labelClass} htmlFor="nw-week-index">
                  Week number
                </label>
                <input
                  id="nw-week-index"
                  type="number"
                  min={1}
                  className={`${inputClass} mt-1`}
                  value={weekIndex}
                  onChange={(e) => setWeekIndex(Number(e.target.value))}
                />
              </div>
            ) : null}
            <div>
              <label className={labelClass} htmlFor="nw-notes">
                Notes
              </label>
              <textarea
                id="nw-notes"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you do this week?"
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-[var(--gn-text-muted)]">
              Room readings if you track them—all optional.
            </p>
            <div>
              <label className={labelClass}>Temp °C</label>
              <input
                className={`${inputClass} mt-1`}
                value={tempC}
                onChange={(e) => setTempC(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Humidity %</label>
              <input
                className={`${inputClass} mt-1`}
                value={humidityPct}
                onChange={(e) => setHumidityPct(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>pH</label>
              <input
                className={`${inputClass} mt-1`}
                value={ph}
                onChange={(e) => setPh(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>EC</label>
              <input
                className={`${inputClass} mt-1`}
                value={ec}
                onChange={(e) => setEc(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>PPM / TDS</label>
              <input
                className={`${inputClass} mt-1`}
                value={ppm}
                onChange={(e) => setPpm(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Light cycle</label>
              <input
                className={`${inputClass} mt-1`}
                value={lightCycle}
                onChange={(e) => setLightCycle(e.target.value)}
                placeholder="e.g. 18/6 or 12/12"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="nw-water">
                Watering & feed notes
              </label>
              <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                Volume, frequency, runoff, or feed schedule for this week.
              </p>
              <textarea
                id="nw-water"
                rows={4}
                value={waterNotes}
                onChange={(e) => setWaterNotes(e.target.value)}
                className={`${inputClass} mt-2`}
              />
            </div>
            {mode === "create" ? (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--gn-text)]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={copyNutrientsFromPreviousWeek}
                  onChange={(e) => setCopyNutrients(e.target.checked)}
                />
                <span>Copy nutrient lines from the previous week at save</span>
              </label>
            ) : null}
            {mode === "create" && copyNutrientsFromPreviousWeek ? (
              <p className="text-sm text-[var(--gn-text-muted)]">
                Nutrient lines will be copied from the previous week when you
                save.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={labelClass}>Nutrient lines</span>
                  <button
                    type="button"
                    onClick={addNutrientLine}
                    className="text-xs font-medium text-emerald-500 hover:underline"
                  >
                    Add line
                  </button>
                </div>
                <ul className="space-y-3">
                  {nutrientLines.map((line, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-3">
                          <label className="text-xs text-[var(--gn-text-muted)]">
                            Product ID (optional UUID)
                          </label>
                          <input
                            className={`${inputClass} mt-0.5`}
                            value={line.productId}
                            onChange={(e) =>
                              setNutrientLines((prev) =>
                                prev.map((l, j) =>
                                  j === i
                                    ? { ...l, productId: e.target.value }
                                    : l,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-[var(--gn-text-muted)]">
                            Label
                          </label>
                          <input
                            className={`${inputClass} mt-0.5`}
                            value={line.customLabel}
                            onChange={(e) =>
                              setNutrientLines((prev) =>
                                prev.map((l, j) =>
                                  j === i
                                    ? { ...l, customLabel: e.target.value }
                                    : l,
                                ),
                              )
                            }
                            placeholder="e.g. CalMag"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--gn-text-muted)]">
                            Dosage
                          </label>
                          <input
                            className={`${inputClass} mt-0.5`}
                            value={line.dosage}
                            onChange={(e) =>
                              setNutrientLines((prev) =>
                                prev.map((l, j) =>
                                  j === i
                                    ? { ...l, dosage: e.target.value }
                                    : l,
                                ),
                              )
                            }
                            placeholder="5 ml/gal"
                          />
                        </div>
                      </div>
                      {nutrientLines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeNutrientLine(i)}
                          className="mt-2 text-xs text-[var(--gn-text-muted)] hover:text-red-400"
                        >
                          Remove line
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <label className={labelClass}>Photos</label>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Upload from your device or paste up to {MAX_IMAGES} https image
              URLs.
            </p>
            <div className="mt-4">
              <NotebookImagePickDropzone
                disabled={saving || remainingImageSlots <= 0}
                remainingSlots={remainingImageSlots}
                onImageUrl={appendUploadedImage}
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

        {step === 5 ? (
          <ul className="space-y-2 text-sm text-[var(--gn-text-muted)]">
            <li>
              <span className="font-medium text-[var(--gn-text)]">Week:</span>{" "}
              {weekIndex}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">Notes:</span>{" "}
              {notes.trim()
                ? `${notes.trim().slice(0, 120)}${notes.trim().length > 120 ? "…" : ""}`
                : "—"}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">
                Environment:
              </span>{" "}
              {[
                tempC.trim() && `temp ${tempC.trim()}°C`,
                humidityPct.trim() && `RH ${humidityPct.trim()}%`,
                ph.trim() && `pH ${ph.trim()}`,
                ec.trim() && `EC ${ec.trim()}`,
                ppm.trim() && `ppm ${ppm.trim()}`,
                lightCycle.trim() && `lights ${lightCycle.trim()}`,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">
                Water / feed:
              </span>{" "}
              {waterNotes.trim()
                ? `${waterNotes.trim().slice(0, 100)}${waterNotes.trim().length > 100 ? "…" : ""}`
                : "—"}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">Photos:</span>{" "}
              {imageUrls.map((u) => u.trim()).filter(Boolean).length}
            </li>
          </ul>
        ) : null}

        {step === 5 && error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : step !== 5 && error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : null}

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
              onClick={() => {
                if (step === 1 && mode === "create" && !(weekIndex >= 1)) return;
                setStep((s) => Math.min(STEPS, s + 1));
              }}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              Next <span aria-hidden>›</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              {saving ? "Saving…" : "Save week"}
            </button>
          )}
        </div>
      </div>
    </NotebookCenteredModal>
  );
}
