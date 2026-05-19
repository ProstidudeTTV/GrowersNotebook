"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { PostMediaDropzone } from "@/components/post-media-dropzone";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";
import type { DosageUnit, TempUnit, VolumeUnit } from "@/lib/notebook-units";
import {
  DOSAGE_UNITS,
  formatNutrientDosage,
  isUuid,
  litersToDisplayVolume,
  parseDisplayTempToC,
  parseDisplayVolumeToLiters,
  parseNutrientDosage,
  tempCToDisplay,
  tempSuffix,
  volumeSuffix,
} from "@/lib/notebook-units";

const STEPS = 5;
const MAX_IMAGES = 8;
const MAX_NOTE_SLOTS = 3;

type WeekRow = NotebookDetailPayload["weeks"][number];

type WaterLineUi = { notes: string; vol: string };

type NoteSlot = { body: string; at?: string };

function emptyNoteSlots(): NoteSlot[] {
  return Array.from({ length: MAX_NOTE_SLOTS }, () => ({ body: "" }));
}

function slotsFromWeekRow(w: WeekRow): NoteSlot[] {
  const slots = emptyNoteSlots();
  const raw = (w as { noteSpots?: { body?: string; at?: string }[] }).noteSpots;
  if (Array.isArray(raw) && raw.length > 0) {
    raw.slice(0, MAX_NOTE_SLOTS).forEach((s, i) => {
      slots[i] = {
        body: String(s?.body ?? ""),
        at: typeof s?.at === "string" ? s.at : undefined,
      };
    });
    return slots;
  }
  if (w.notes?.trim()) {
    slots[0] = {
      body: w.notes,
      at:
        typeof w.createdAt === "string" && w.createdAt
          ? w.createdAt
          : undefined,
    };
  }
  return slots;
}

function buildNoteSpotsPayload(
  slots: NoteSlot[],
  initial: NoteSlot[] | null,
): { body: string; at?: string }[] {
  const out: { body: string; at?: string }[] = [];
  for (let i = 0; i < MAX_NOTE_SLOTS; i++) {
    const body = slots[i].body.trim();
    if (!body) continue;
    const init = initial?.[i];
    const unchanged =
      !!init &&
      init.body.trim() === body &&
      typeof init.at === "string" &&
      init.at.length > 0;
    out.push(unchanged ? { body, at: init.at } : { body });
  }
  return out.slice(0, MAX_NOTE_SLOTS);
}

type NutLine = {
  productId: string;
  customLabel: string;
  dosageAmount: string;
  dosageUnit: DosageUnit;
};

const DOSAGE_AMOUNT_OPTS = Array.from({ length: 25 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

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
  if (!list.length)
    return [
      {
        productId: "",
        customLabel: "",
        dosageAmount: "",
        dosageUnit: "ml/L",
      },
    ];
  return list.map((n) => {
    const d = parseNutrientDosage(
      String((n as { dosage?: string }).dosage ?? ""),
    );
    return {
      productId: String((n as { productId?: string }).productId ?? ""),
      customLabel: String((n as { customLabel?: string }).customLabel ?? ""),
      dosageAmount: d.amount,
      dosageUnit: d.unit,
    };
  });
}

function serializeNutrients(lines: NutLine[]) {
  return lines
    .map((line, sortOrder) => {
      const customLabel = line.customLabel.trim() || null;
      const dosage = formatNutrientDosage(
        line.dosageAmount,
        line.dosageUnit,
      );
      const row: {
        productId?: string;
        customLabel: string | null;
        dosage: string | null;
        sortOrder: number;
      } = {
        customLabel,
        dosage,
        sortOrder,
      };
      if (isUuid(line.productId)) row.productId = line.productId.trim();
      return row;
    })
    .filter((l) => {
      const hasP = typeof l.productId === "string" && l.productId.length > 0;
      const hasL = l.customLabel != null && l.customLabel !== "";
      const hasD = l.dosage != null && l.dosage !== "";
      return hasP || hasL || hasD;
    });
}

const fieldShell =
  "w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-4 text-sm leading-snug text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-[color-mix(in_srgb,var(--gn-accent)_60%,transparent)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--gn-accent)_40%,transparent)]";

/** Single-line fields */
const inputClass = `${fieldShell} py-2.5 min-h-[2.75rem]`;

/** Multi-line notes */
const textareaClass = `${fieldShell} py-3`;

const labelClass = "block text-sm font-semibold text-[var(--gn-text)]";

export function NotebookWeekWizard({
  open,
  notebookId,
  mode,
  existingWeek,
  nextWeekIndex,
  preferredTempUnit,
  preferredVolumeUnit,
  onClose,
  onSaved,
}: {
  open: boolean;
  notebookId: string;
  mode: "create" | "edit";
  existingWeek: WeekRow | null;
  nextWeekIndex: number;
  preferredTempUnit: TempUnit;
  preferredVolumeUnit: VolumeUnit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weekIndex, setWeekIndex] = useState(nextWeekIndex);
  const [noteSlots, setNoteSlots] = useState<NoteSlot[]>(emptyNoteSlots);
  const initialNoteSlotsRef = useRef<NoteSlot[] | null>(null);
  const [copyNutrientsFromPreviousWeek, setCopyNutrients] = useState(false);
  const [tempInput, setTempInput] = useState("");
  const [humidityPct, setHumidityPct] = useState("");
  const [ph, setPh] = useState("");
  const [ec, setEc] = useState("");
  const [ppm, setPpm] = useState("");
  const [waterLines, setWaterLines] = useState<WaterLineUi[]>([
    { notes: "", vol: "" },
  ]);
  const [nutrientLines, setNutrientLines] = useState<NutLine[]>([
    { productId: "", customLabel: "", dosageAmount: "", dosageUnit: "ml/L" },
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
      const loaded = slotsFromWeekRow(w);
      setNoteSlots(loaded);
      initialNoteSlotsRef.current = loaded.map((s) => ({ ...s }));
      setCopyNutrients(false);
      setTempInput(tempCToDisplay(preferredTempUnit, w.tempC ?? null));
      setHumidityPct(w.humidityPct ?? "");
      setPh(w.ph ?? "");
      setEc(w.ec ?? "");
      setPpm(w.ppm ?? "");
      const wAny = w as {
        waterings?: {
          notes: string | null;
          volumeLiters: string | null;
        }[];
      };
      if (wAny.waterings && wAny.waterings.length > 0) {
        setWaterLines(
          wAny.waterings.map((x) => ({
            notes: x.notes ?? "",
            vol: litersToDisplayVolume(
              preferredVolumeUnit,
              x.volumeLiters ?? null,
            ),
          })),
        );
      } else {
        setWaterLines([
          {
            notes: w.waterNotes ?? "",
            vol: litersToDisplayVolume(
              preferredVolumeUnit,
              w.waterVolumeLiters ?? null,
            ),
          },
        ]);
      }
      setNutrientLines(linesFromWeek(w));
      const urls = (w.imageUrls ?? []).filter(Boolean);
      setImageUrls(urls.length ? urls : [""]);
    } else {
      setWeekIndex(nextWeekIndex);
      setNoteSlots(emptyNoteSlots());
      initialNoteSlotsRef.current = null;
      setCopyNutrients(false);
      setTempInput("");
      setHumidityPct("");
      setPh("");
      setEc("");
      setPpm("");
      setWaterLines([{ notes: "", vol: "" }]);
      setNutrientLines([
        { productId: "", customLabel: "", dosageAmount: "", dosageUnit: "ml/L" },
      ]);
      setImageUrls([""]);
    }
  }, [
    open,
    mode,
    existingWeek,
    nextWeekIndex,
    preferredTempUnit,
    preferredVolumeUnit,
  ]);

  const stepTitle = [
    "📝 What happened this week?",
    "🌡️ Room conditions",
    "💧 Watering & feeding",
    "📷 Add photos",
    "✅ Looks good?",
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
      {
        productId: "",
        customLabel: "",
        dosageAmount: "",
        dosageUnit: "ml/L",
      },
    ]);
  }

  function addWaterLine() {
    setWaterLines((prev) => [...prev, { notes: "", vol: "" }]);
  }

  function removeWaterLine(i: number) {
    setWaterLines((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length ? next : [{ notes: "", vol: "" }];
    });
  }

  function removeNutrientLine(i: number) {
    setNutrientLines((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length
        ? next
        : [
            {
              productId: "",
              customLabel: "",
              dosageAmount: "",
              dosageUnit: "ml/L",
            },
          ];
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

      const noteSpots = buildNoteSpotsPayload(
        noteSlots,
        mode === "edit" ? initialNoteSlotsRef.current : null,
      );
      const wateringsPayload = waterLines
        .map((l, i) => ({
          notes: l.notes.trim() || null,
          volumeLiters:
            parseDisplayVolumeToLiters(preferredVolumeUnit, l.vol) ?? null,
          sortOrder: i,
        }))
        .filter((l) => l.notes || l.volumeLiters);

      const sharedBase = {
        noteSpots,
        tempC: parseDisplayTempToC(preferredTempUnit, tempInput),
        humidityPct: humidityPct.trim() || null,
        ph: ph.trim() || null,
        ec: ec.trim() || null,
        ppm: ppm.trim() || null,
        lightCycle: null,
        imageUrls: urls,
      };

      const shared =
        mode === "edit"
          ? { ...sharedBase, waterings: wateringsPayload }
          : wateringsPayload.length > 0
            ? { ...sharedBase, waterings: wateringsPayload }
            : {
                ...sharedBase,
                waterNotes: waterLines[0]?.notes.trim() || null,
                waterVolumeLiters:
                  parseDisplayVolumeToLiters(
                    preferredVolumeUnit,
                    waterLines[0]?.vol ?? "",
                  ) ?? null,
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
    >
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 border-b border-[var(--gn-divide)] pb-4">
          <div className="flex gap-1">
            {Array.from({ length: STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 min-w-0 flex-1 rounded-full transition ${
                  step >= i + 1 ? "bg-[var(--gn-accent)]" : "bg-[var(--gn-divide)]"
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
              Write your main update for the week. You can also add a mid-week note if something important changed.
            </p>
            {mode === "create" ? (
              <div>
                <label className={labelClass} htmlFor="nw-week-index">
                  Which week is this?
                </label>
                <input
                  id="nw-week-index"
                  type="number"
                  min={1}
                  className={`${inputClass} mt-1`}
                  value={weekIndex}
                  onChange={(e) => setWeekIndex(Number(e.target.value))}
                  placeholder="e.g. 1"
                />
                <p className="text-xs text-[var(--gn-text-muted)] mt-1 leading-relaxed">
                  Week 1 = first week of your grow. Just add 1 each week.
                </p>
              </div>
            ) : null}
            {noteSlots.map((slot, i) => {
              const prompts =
                i === 0
                  ? [
                      "How's the growth looking?",
                      "Any issues or concerns?",
                      "Smell / structure update",
                      "Feeding changes this week",
                    ]
                  : ["Any mid-week changes?", "Spotted anything new?"];
              return (
                <div key={i}>
                  <label className={labelClass} htmlFor={`nw-notes-${i}`}>
                    {i === 0
                      ? "Your weekly update"
                      : `Mid-week note ${i} (optional)`}
                  </label>
                  {i === 0 && slot.body.length === 0 ? (
                    <div className="mt-1 mb-1 flex flex-wrap gap-1.5">
                      {prompts.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setNoteSlots((prev) => {
                              const next = [...prev];
                              next[0] = {
                                ...next[0],
                                body: next[0].body
                                  ? `${next[0].body}\n${p} `
                                  : `${p} `,
                              };
                              return next;
                            })
                          }
                          className="rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-1 text-xs text-[var(--gn-text-muted)] hover:border-[color-mix(in_srgb,var(--gn-accent)_50%,transparent)] hover:text-[var(--gn-accent)] transition-colors"
                        >
                          + {p}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <textarea
                    id={`nw-notes-${i}`}
                    rows={i === 0 ? 5 : 3}
                    value={slot.body}
                    onChange={(e) =>
                      setNoteSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], body: e.target.value };
                        return next;
                      })
                    }
                    placeholder={
                      i === 0
                        ? "How did the plants look this week? Any changes in growth, smell, color? Any problems or wins? What did you feed them?"
                        : "Did anything change later in the week?"
                    }
                    className={`${textareaClass} mt-1`}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
              What were the conditions in your grow space? All optional — even one reading helps you spot trends over time.
            </p>
            <div>
              <label className={labelClass}>
                Temperature ({tempSuffix(preferredTempUnit)})
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 75°F / 24°C"
              />
              <p className="mt-1 text-xs text-[var(--gn-text-muted)] leading-relaxed">
                Ideal range: 70–85°F (21–29°C) during lights-on
              </p>
            </div>
            <div>
              <label className={labelClass}>Humidity %</label>
              <input
                className={`${inputClass} mt-1`}
                value={humidityPct}
                onChange={(e) => setHumidityPct(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 55%"
              />
              <p className="mt-1 text-xs text-[var(--gn-text-muted)] leading-relaxed">
                Veg: 50–70% · Flower: 40–55% · Late flower: 35–45%
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className={labelClass}>Watering sessions this week</span>
                <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                  Add each watering separately if amounts or notes differ.
                </p>
              </div>
              <button
                type="button"
                onClick={addWaterLine}
                className="text-xs font-medium text-[var(--gn-accent)] hover:underline"
              >
                + Add watering
              </button>
            </div>
            <ul className="space-y-4">
              {waterLines.map((line, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-4"
                >
                  <label className={labelClass} htmlFor={`nw-water-${i}`}>
                    What happened? (optional)
                  </label>
                  <textarea
                    id={`nw-water-${i}`}
                    rows={3}
                    value={line.notes}
                    onChange={(e) =>
                      setWaterLines((prev) =>
                        prev.map((l, j) =>
                          j === i ? { ...l, notes: e.target.value } : l,
                        ),
                      )
                    }
                    placeholder="e.g. Slight runoff, soil was dry before watering, plain water this time"
                    className={`${textareaClass} mt-2`}
                  />
                  <label
                    className={`${labelClass} mt-3 block`}
                    htmlFor={`nw-water-vol-${i}`}
                  >
                    How much water? ({volumeSuffix(preferredVolumeUnit)})
                  </label>
                  <input
                    id={`nw-water-vol-${i}`}
                    className={`${inputClass} mt-2`}
                    value={line.vol}
                    onChange={(e) =>
                      setWaterLines((prev) =>
                        prev.map((l, j) =>
                          j === i ? { ...l, vol: e.target.value } : l,
                        ),
                      )
                    }
                    inputMode="decimal"
                    placeholder="e.g. 2.5"
                  />
                  <p className="text-xs text-[var(--gn-text-muted)] mt-1 leading-relaxed">
                    Total for all plants this session — or leave blank.
                  </p>
                  {waterLines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeWaterLine(i)}
                      className="mt-2 text-xs text-[var(--gn-text-muted)] hover:text-red-400"
                    >
                      Remove entry
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <p className="sm:col-span-3 text-xs leading-relaxed text-[var(--gn-text-muted)]">
                Water readings — log what you can, skip what you don&apos;t measure.
              </p>
              <div>
                <label className={labelClass}>pH</label>
                <input
                  className={`${inputClass} mt-1`}
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 6.2"
                />
                <p className="mt-1 text-xs text-[var(--gn-text-muted)] leading-relaxed">
                  Soil: 6.0–7.0 · Hydro/coco: 5.5–6.5
                </p>
              </div>
              <div>
                <label className={labelClass}>
                  EC{" "}
                  <span className="font-normal text-[var(--gn-text-muted)] text-xs">(nutrient strength in mS/cm)</span>
                </label>
                <input
                  className={`${inputClass} mt-1`}
                  value={ec}
                  onChange={(e) => setEc(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 1.4"
                />
                <p className="mt-1 text-xs text-[var(--gn-text-muted)] leading-relaxed">
                  Low = weak feed · High = strong feed. Seedling ≈ 0.8–1.4
                </p>
              </div>
              <div>
                <label className={labelClass}>PPM <span className="font-normal text-[var(--gn-text-muted)] text-xs">(nutrient strength in parts per million)</span></label>
                <input
                  className={`${inputClass} mt-1`}
                  value={ppm}
                  onChange={(e) => setPpm(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 840"
                />
                <p className="mt-1 text-xs text-[var(--gn-text-muted)] leading-relaxed">
                  Only fill this OR EC — same reading, different scale.
                </p>
              </div>
            </div>
            {mode === "create" ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3 text-sm text-[var(--gn-text)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--gn-accent)]"
                  checked={copyNutrientsFromPreviousWeek}
                  onChange={(e) => setCopyNutrients(e.target.checked)}
                />
                <div>
                  <p className="font-medium">Same nutrients as last week</p>
                  <p className="text-xs text-[var(--gn-text-muted)]">Check this to reuse the same products and amounts — saves time.</p>
                </div>
              </label>
            ) : null}
            {mode === "create" && copyNutrientsFromPreviousWeek ? null : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={labelClass}>What did you feed them?</span>
                    <p className="text-xs text-[var(--gn-text-muted)]">List each product separately.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addNutrientLine}
                    className="text-xs font-medium text-[var(--gn-accent)] hover:underline"
                  >
                    + Add product
                  </button>
                </div>
                <ul className="space-y-4">
                  {nutrientLines.map((line, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-4"
                    >
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs text-[var(--gn-text-muted)]">
                            Product name
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
                            placeholder="e.g. CalMag, Bloom A"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--gn-text-muted)]">
                            How much?
                          </label>
                          <select
                            className={`${inputClass} mt-0.5`}
                            value={line.dosageAmount}
                            onChange={(e) =>
                              setNutrientLines((prev) =>
                                prev.map((l, j) =>
                                  j === i
                                    ? { ...l, dosageAmount: e.target.value }
                                    : l,
                                ),
                              )
                            }
                          >
                            <option value="">—</option>
                            {DOSAGE_AMOUNT_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-xs text-[var(--gn-text-muted)]">
                            Unit (ml, g, tsp…)
                          </label>
                          <select
                            className={`${inputClass} mt-0.5`}
                            value={line.dosageUnit}
                            onChange={(e) =>
                              setNutrientLines((prev) =>
                                prev.map((l, j) =>
                                  j === i
                                    ? {
                                        ...l,
                                        dosageUnit: e.target.value as DosageUnit,
                                      }
                                    : l,
                                ),
                              )
                            }
                          >
                            {DOSAGE_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
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
            <label className={labelClass}>Add photos</label>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Drag and drop, click to browse, or paste image links below. Up to {MAX_IMAGES} photos per week.
            </p>
            <div className="mt-4">
              <PostMediaDropzone
                disabled={saving || remainingImageSlots <= 0}
                onMediaReady={(url, kind) => {
                  if (kind === "video") {
                    setUploadError(
                      "Weekly entries support photos only. Add a video link in notes if needed.",
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
                  className="text-xs font-medium text-[var(--gn-accent)] hover:underline"
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
              {(() => {
                const preview = noteSlots
                  .map((s) => s.body.trim())
                  .filter(Boolean)
                  .join(" · ");
                return preview.length
                  ? `${preview.slice(0, 140)}${preview.length > 140 ? "…" : ""}`
                  : "—";
              })()}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">
                Environment:
              </span>{" "}
              {[
                tempInput.trim() &&
                  `temp ${tempInput.trim()}${tempSuffix(preferredTempUnit)}`,
                humidityPct.trim() && `RH ${humidityPct.trim()}%`,
                ph.trim() && `pH ${ph.trim()}`,
                ec.trim() && `EC ${ec.trim()}`,
                ppm.trim() && `ppm ${ppm.trim()}`,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </li>
            <li>
              <span className="font-medium text-[var(--gn-text)]">
                Water / feed:
              </span>{" "}
              {(() => {
                const parts = waterLines
                  .map((l) => {
                    const v = l.vol.trim();
                    const n = l.notes.trim();
                    const volBit =
                      v &&
                      `vol ${v} ${volumeSuffix(preferredVolumeUnit)}`;
                    const noteBit =
                      n.length > 80 ? `${n.slice(0, 80)}…` : n;
                    return [volBit, noteBit].filter(Boolean).join(" — ");
                  })
                  .filter(Boolean);
                return parts.length ? parts.join(" · ") : "—";
              })()}
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
              disabled={!canContinue || saving}
              onClick={() => {
                if (step === 1 && mode === "create" && !(weekIndex >= 1)) return;
                setStep((s) => Math.min(STEPS, s + 1));
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110 disabled:opacity-45"
            >
              Next <span aria-hidden>›</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110 disabled:opacity-45"
            >
              {saving ? "Saving…" : "Save week"}
            </button>
          )}
        </div>
      </div>
    </NotebookCenteredModal>
  );
}
