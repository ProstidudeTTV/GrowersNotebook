"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";
import { NotebookWizardLeaveDialog } from "@/components/notebook-wizard-leave-dialog";
import { useNotebookWizardLeaveGuard } from "@/lib/use-notebook-wizard-leave-guard";
import {
  normalizeTempUnit,
  normalizeVolumeUnit,
} from "@/lib/notebook-units";

const STEPS = 4;

const inputClass =
  "w-full rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-4 py-3 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-[var(--gn-accent)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--gn-accent)]/40 transition";

const labelClass = "block text-sm font-semibold text-[var(--gn-text)] mb-1";
const helpClass = "mt-1.5 text-xs text-[var(--gn-text-muted)] leading-relaxed";

function PillChoice({
  options,
  value,
  onChange,
  allowDeselect = false,
}: {
  options: { value: string; label: string; icon?: string }[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() =>
            onChange(
              allowDeselect && value === o.value ? undefined : o.value,
            )
          }
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
            value === o.value
              ? "border-[var(--gn-accent)] bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]"
              : "border-[var(--gn-divide)] bg-[var(--gn-surface)] text-[var(--gn-text-muted)] hover:border-[var(--gn-accent)]/40 hover:text-[var(--gn-text)]"
          }`}
        >
          {o.icon ? `${o.icon} ` : ""}{o.label}
        </button>
      ))}
    </div>
  );
}

export function NotebookSetupWizard({
  open,
  notebook,
  onClose,
  onCompleted,
}: {
  open: boolean;
  notebook: NotebookDetailPayload | null;
  onClose: () => void;
  onCompleted: (createdNotebookId?: string) => void | Promise<void>;
}) {
  const isCreate = notebook === null;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { leaveOpen, requestClose, confirmLeave, dismissLeave } =
    useNotebookWizardLeaveGuard(open, dirty);

  const [title, setTitle] = useState("");
  const [strainLabel, setStrainLabel] = useState("");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [volumeUnit, setVolumeUnit] = useState<"L" | "gal">("L");
  const [roomType, setRoomType] = useState<string | undefined>(undefined);
  const [wateringType, setWateringType] = useState<string | undefined>(undefined);
  const [startType, setStartType] = useState<string | undefined>(undefined);
  const [plantCount, setPlantCount] = useState<string>("");
  const [lightWatts, setLightWatts] = useState<string>("");
  const [vegLightCycle, setVegLightCycle] = useState<string>("");
  const [flowerLightCycle, setFlowerLightCycle] = useState<string>("");
  const [setupNotes, setSetupNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    setStep(1);
    setError(null);
    if (!notebook) {
      setTitle(""); setStrainLabel(""); setTempUnit("C"); setVolumeUnit("L");
      setRoomType(undefined); setWateringType(undefined); setStartType(undefined);
      setPlantCount(""); setLightWatts(""); setVegLightCycle("");
      setFlowerLightCycle(""); setSetupNotes("");
      return;
    }
    setTitle(notebook.title ?? "");
    setStrainLabel(notebook.customStrainLabel ?? "");
    setTempUnit(normalizeTempUnit(notebook.preferredTempUnit));
    setVolumeUnit(normalizeVolumeUnit(notebook.preferredVolumeUnit) as "L" | "gal");
    setRoomType(notebook.roomType ?? undefined);
    setWateringType(notebook.wateringType ?? undefined);
    setStartType(notebook.startType ?? undefined);
    setPlantCount(notebook.plantCount != null ? String(notebook.plantCount) : "");
    setLightWatts(notebook.totalLightWatts ?? "");
    setVegLightCycle(notebook.vegLightCycle ?? "");
    setFlowerLightCycle(notebook.flowerLightCycle ?? "");
    setSetupNotes(notebook.setupNotes ?? "");
  }, [open, notebook]);

  async function patchBody(extra: Record<string, unknown>) {
    if (!notebook) throw new Error("Missing notebook.");
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) throw new Error("Sign in to save.");
    await apiFetch(`/notebooks/${notebook.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(extra),
    });
  }

  async function finishSetup() {
    setError(null);
    setSaving(true);
    try {
      if (!title.trim()) { setError("Give your grow a name first."); setStep(1); setSaving(false); return; }
      const payload = {
        title: title.trim(),
        customStrainLabel: strainLabel.trim() || null,
        preferredTempUnit: tempUnit,
        preferredVolumeUnit: volumeUnit,
        roomType: roomType ?? null,
        wateringType: wateringType ?? null,
        startType: startType ?? null,
        plantCount: plantCount ? parseInt(plantCount, 10) : null,
        totalLightWatts: lightWatts.trim() || null,
        vegLightCycle: vegLightCycle.trim() || null,
        flowerLightCycle: flowerLightCycle.trim() || null,
        setupNotes: setupNotes.trim() || null,
        setupWizardCompletedAt: new Date().toISOString(),
      };
      if (isCreate) {
        const supabase = createClient();
        const token = await getAccessTokenForApi(supabase);
        if (!token) throw new Error("Sign in to save.");
        const row = await apiFetch<{ id: string }>("/notebooks", {
          method: "POST",
          token,
          body: JSON.stringify({ ...payload, strainId: null, status: "active" }),
        });
        await onCompleted(row.id);
      } else {
        await patchBody(payload);
        await onCompleted();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function skipSetup() {
    if (!notebook) return;
    setError(null);
    setSaving(true);
    try {
      await patchBody({ setupWizardCompletedAt: new Date().toISOString() });
      await onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update notebook");
    } finally {
      setSaving(false);
    }
  }

  const STEP_TITLES = [
    "📖 Name your grow",
    "🌱 How are you growing?",
    "🏕️ Describe your setup",
    "✅ Ready to go!",
  ];

  const canGoNext = step === 1 ? title.trim().length > 0 : true;

  return (
    <>
    <NotebookCenteredModal
      open={open}
      onClose={() => requestClose(onClose, { saving })}
      title="Set up your notebook"
    >
      <div
        className="px-5 py-5 sm:px-6 sm:py-6"
        onInputCapture={() => setDirty(true)}
        onChangeCapture={() => setDirty(true)}
      >
        <div className="mx-auto w-full max-w-3xl">

          {/* Progress */}
          <div className="mb-6">
            <div className="flex gap-1">
              {Array.from({ length: STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 min-w-0 flex-1 rounded-full transition ${
                    step >= i + 1 ? "bg-[var(--gn-accent)]" : "bg-neutral-600/50"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-sm font-semibold text-[var(--gn-text)]">
              {STEP_TITLES[step - 1]}
            </p>
            <p className="text-xs text-[var(--gn-text-muted)]">Step {step} of {STEPS}</p>
          </div>

          {/* Step 1 — Name */}
          {step === 1 && (
            <div className="space-y-5">
              {notebook?.strain?.slug ? (
                <p className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-4 py-3 text-sm text-[var(--gn-text-muted)]">
                  This grow is linked to{" "}
                  <Link href={`/strains/${encodeURIComponent(notebook.strain.slug)}`}
                    className="font-medium text-[var(--gn-accent)] hover:underline">
                    {notebook.strain.name?.trim() || notebook.strain.slug}
                  </Link>{" "}in the strain catalog.
                </p>
              ) : (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  Give your grow a name people will recognize — you can change it anytime.
                </p>
              )}
              <div>
                <label className={labelClass} htmlFor="ns-title">What are you calling this grow?</label>
                <input
                  id="ns-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Blue Dream — Spring 2026"
                  autoFocus
                />
                <p className={helpClass}>Keep it short and memorable. Strain + season works great.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="ns-strain">What strain are you growing? <span className="font-normal text-[var(--gn-text-muted)]">(optional)</span></label>
                <input
                  id="ns-strain"
                  value={strainLabel}
                  onChange={(e) => setStrainLabel(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Blue Dream, Wedding Cake..."
                />
                <p className={helpClass}>Just a label — you can link to the full strain catalog after setup.</p>
              </div>
            </div>
          )}

          {/* Step 2 — Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--gn-text-muted)]">
                These help other growers compare setups. All optional — fill in what you know.
              </p>

              <div>
                <label className={labelClass}>Where are you growing?</label>
                  <PillChoice
                    allowDeselect
                    options={[
                      { value: "indoor", label: "Indoor", icon: "🏠" },
                      { value: "outdoor", label: "Outdoor", icon: "☀️" },
                      { value: "greenhouse", label: "Greenhouse", icon: "🪟" },
                    ]}
                    value={roomType}
                    onChange={setRoomType}
                  />
              </div>

              <div>
                <label className={labelClass}>How did you start?</label>
                <PillChoice
                  allowDeselect
                  options={[
                    { value: "seed", label: "From seed" },
                    { value: "clone", label: "From clone" },
                    { value: "seedling", label: "Already a seedling" },
                  ]}
                  value={startType}
                  onChange={setStartType}
                />
              </div>

              <div>
                <label className={labelClass}>How do you water?</label>
                <PillChoice
                  allowDeselect
                  options={[
                    { value: "manual", label: "By hand" },
                    { value: "drip", label: "Drip system" },
                    { value: "hydro", label: "Hydro / DWC" },
                    { value: "aeroponic", label: "Aeroponic" },
                  ]}
                  value={wateringType}
                  onChange={setWateringType}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Temperatures</label>
                  <PillChoice
                    options={[{ value: "F", label: "°F" }, { value: "C", label: "°C" }]}
                    value={tempUnit}
                    onChange={(v) => setTempUnit((v as "C" | "F") ?? "C")}
                  />
                  <p className={helpClass}>Used for your weekly readings.</p>
                </div>
                <div>
                  <label className={labelClass}>Water volume</label>
                  <PillChoice
                    options={[{ value: "L", label: "Liters" }, { value: "gal", label: "Gallons" }]}
                    value={volumeUnit}
                    onChange={(v) => setVolumeUnit((v as "L" | "gal") ?? "L")}
                  />
                  <p className={helpClass}>Used when logging waterings.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="ns-plants">Number of plants</label>
                  <input
                    id="ns-plants"
                    type="number"
                    min={1}
                    value={plantCount}
                    onChange={(e) => setPlantCount(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 4"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="ns-watts">Total light watts</label>
                  <input
                    id="ns-watts"
                    value={lightWatts}
                    onChange={(e) => setLightWatts(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 480"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="ns-veg-light">Veg light schedule</label>
                  <input
                    id="ns-veg-light"
                    value={vegLightCycle}
                    onChange={(e) => setVegLightCycle(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 18/6"
                  />
                  <p className={helpClass}>Hours on / hours off</p>
                </div>
                <div>
                  <label className={labelClass} htmlFor="ns-flower-light">Flower light schedule</label>
                  <input
                    id="ns-flower-light"
                    value={flowerLightCycle}
                    onChange={(e) => setFlowerLightCycle(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 12/12"
                  />
                  <p className={helpClass}>Hours on / hours off</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Setup notes */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--gn-text-muted)]">
                Describe your grow room for readers. The more detail you give, the more useful your notebook is to other growers who want to replicate your results.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Tent size",
                  "Grow medium",
                  "Nutrient line",
                  "Carbon filter",
                  "Training method",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() =>
                      setSetupNotes((prev) =>
                        prev ? `${prev}\n${prompt}: ` : `${prompt}: `
                      )
                    }
                    className="rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-1 text-xs text-[var(--gn-text-muted)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_50%,transparent)] hover:text-[var(--gn-accent)]"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>
              <textarea
                value={setupNotes}
                onChange={(e) => setSetupNotes(e.target.value)}
                rows={7}
                className={inputClass}
                placeholder="e.g. 4×4 tent, Mars Hydro FC8000 (800W), coco/perlite 70/30, Athena nutrients, AC Infinity fan with carbon filter, temps sit around 78°F with lights on..."
              />
              <p className={helpClass}>Tap any prompt above to add it to your notes, or just write freely.</p>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[color-mix(in_srgb,var(--gn-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--gn-accent)_10%,transparent)] p-5 text-center">
                <div className="mx-auto mb-3 text-4xl">🌱</div>
                <h3 className="text-base font-bold text-[var(--gn-text)]">
                  {isCreate ? "Ready to create your notebook!" : "Ready to save!"}
                </h3>
                <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                  {isCreate
                    ? "Your notebook will be created and you can start adding weeks right away."
                    : "Your notebook setup will be saved. You can update any of this later from the notebook settings."}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] divide-y divide-[var(--gn-divide)] text-sm overflow-hidden">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-[var(--gn-text-muted)]">Name</span>
                  <span className="font-medium text-[var(--gn-text)] truncate ml-4">{title || "—"}</span>
                </div>
                {strainLabel && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[var(--gn-text-muted)]">Strain</span>
                    <span className="font-medium text-[var(--gn-text)]">{strainLabel}</span>
                  </div>
                )}
                {roomType && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[var(--gn-text-muted)]">Location</span>
                    <span className="font-medium text-[var(--gn-text)] capitalize">{roomType}</span>
                  </div>
                )}
                {plantCount && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[var(--gn-text-muted)]">Plants</span>
                    <span className="font-medium text-[var(--gn-text)]">{plantCount}</span>
                  </div>
                )}
              </div>

              {notebook && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void skipSetup()}
                  className="block w-full text-center text-xs text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] underline decoration-dotted"
                >
                  Skip for now — finish setup later
                </button>
              )}
              {!notebook && (
                <p className="text-center text-xs text-[var(--gn-text-muted)]">
                  Close this window to cancel — nothing is saved until you click Create.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--gn-divide)] pt-5">
            <button
              type="button"
              disabled={step <= 1 || saving}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[var(--gn-text)] disabled:opacity-40"
            >
              ‹ Back
            </button>
            {step < STEPS ? (
              <button
                type="button"
                disabled={saving || !canGoNext}
                onClick={() => setStep((s) => Math.min(STEPS, s + 1))}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110 disabled:opacity-45"
              >
                Next ›
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void finishSetup()}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110 disabled:opacity-45"
              >
                {saving ? "Saving…" : isCreate ? "Create notebook →" : "Save Setup →"}
              </button>
            )}
          </div>

        </div>
      </div>
    </NotebookCenteredModal>
    <NotebookWizardLeaveDialog
      open={leaveOpen}
      onStay={dismissLeave}
      onLeave={() => confirmLeave(onClose)}
    />
    </>
  );
}
