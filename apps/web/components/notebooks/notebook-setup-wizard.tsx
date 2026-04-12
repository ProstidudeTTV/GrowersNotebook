"use client";

import { Form, Input, InputNumber, Select } from "antd";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";
import {
  normalizeTempUnit,
  normalizeVolumeUnit,
  TEMP_UNIT_OPTIONS,
  VOLUME_UNIT_OPTIONS,
} from "@/lib/notebook-units";

const STEPS = 4;

const ROOM_OPTIONS = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "greenhouse", label: "Greenhouse" },
];

const WATERING_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "drip", label: "Drip" },
  { value: "hydro", label: "Hydro" },
  { value: "aeroponic", label: "Aeroponic" },
];

const START_OPTIONS = [
  { value: "seed", label: "Seed / germination" },
  { value: "clone", label: "Clone" },
  { value: "seedling", label: "Seedling" },
];

export function NotebookSetupWizard({
  open,
  notebook,
  onClose,
  onCompleted,
}: {
  open: boolean;
  /** When null, wizard creates the notebook on final save (no row until then). */
  notebook: NotebookDetailPayload | null;
  onClose: () => void;
  onCompleted: (createdNotebookId?: string) => void | Promise<void>;
}) {
  const isCreate = notebook === null;
  const [step, setStep] = useState(1);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleWatch = Form.useWatch("title", form);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    if (!notebook) {
      form.setFieldsValue({
        title: "",
        customStrainLabel: "",
        preferredTempUnit: "C",
        preferredVolumeUnit: "L",
        roomType: undefined,
        wateringType: undefined,
        startType: undefined,
        plantCount: undefined,
        totalLightWatts: "",
        vegLightCycle: "",
        flowerLightCycle: "",
        setupNotes: "",
      });
      return;
    }
    form.setFieldsValue({
      title: notebook.title,
      customStrainLabel: notebook.customStrainLabel ?? "",
      preferredTempUnit: normalizeTempUnit(notebook.preferredTempUnit),
      preferredVolumeUnit: normalizeVolumeUnit(notebook.preferredVolumeUnit),
      roomType: notebook.roomType ?? undefined,
      wateringType: notebook.wateringType ?? undefined,
      startType: notebook.startType ?? undefined,
      plantCount: notebook.plantCount ?? undefined,
      totalLightWatts: notebook.totalLightWatts ?? "",
      vegLightCycle: notebook.vegLightCycle ?? "",
      flowerLightCycle: notebook.flowerLightCycle ?? "",
      setupNotes: notebook.setupNotes ?? "",
    });
  }, [open, notebook, form]);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return typeof titleWatch === "string" && titleWatch.trim().length > 0;
    }
    return true;
  }, [step, titleWatch]);

  async function patchBody(extra: Record<string, unknown>) {
    if (!notebook) throw new Error("Missing notebook.");
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) throw new Error("Sign in to save your notebook.");
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
      const v = await form.validateFields();
      const title = String(v.title ?? "").trim();
      if (!title) {
        setError("Add a title.");
        setStep(1);
        setSaving(false);
        return;
      }
      const payload = {
        title,
        customStrainLabel: v.customStrainLabel?.trim() || null,
        preferredTempUnit: normalizeTempUnit(v.preferredTempUnit),
        preferredVolumeUnit: normalizeVolumeUnit(v.preferredVolumeUnit),
        roomType: v.roomType ?? null,
        wateringType: v.wateringType ?? null,
        startType: v.startType ?? null,
        plantCount: v.plantCount ?? null,
        totalLightWatts: v.totalLightWatts?.trim() || null,
        vegLightCycle: v.vegLightCycle?.trim() || null,
        flowerLightCycle: v.flowerLightCycle?.trim() || null,
        setupNotes: v.setupNotes?.trim() || null,
        setupWizardCompletedAt: new Date().toISOString(),
      };
      if (isCreate) {
        const supabase = createClient();
        const token = await getAccessTokenForApi(supabase);
        if (!token) throw new Error("Sign in to save your notebook.");
        const row = await apiFetch<{ id: string }>("/notebooks", {
          method: "POST",
          token,
          body: JSON.stringify({
            ...payload,
            strainId: null,
            status: "active",
          }),
        });
        await onCompleted(row.id);
      } else {
        await patchBody(payload);
        await onCompleted();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save notebook");
    } finally {
      setSaving(false);
    }
  }

  async function skipSetup() {
    if (!notebook) return;
    setError(null);
    setSaving(true);
    try {
      await patchBody({
        setupWizardCompletedAt: new Date().toISOString(),
      });
      await onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update notebook");
    } finally {
      setSaving(false);
    }
  }

  const stepTitle = ["Title", "Grow setup", "Setup notes", "Publish"][
    step - 1
  ];

  return (
    <NotebookCenteredModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title="Set up your notebook"
    >
      <Form
        form={form}
        layout="vertical"
        size="middle"
        className="px-5 py-5 sm:px-6 sm:py-6"
      >
        <div className="mx-auto w-full max-w-3xl">
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

        {/* Keep every Form.Item mounted so Ant Design does not discard values when steps change. */}
        <div className={step === 1 ? "space-y-5" : "hidden"} aria-hidden={step !== 1}>
            {notebook?.strain?.slug ? (
              <p className="text-sm text-[var(--gn-text-muted)]">
                This notebook is linked to the catalog strain{" "}
                <Link
                  href={`/strains/${encodeURIComponent(notebook.strain.slug)}`}
                  className="font-medium text-[#ff4500] hover:underline"
                >
                  {notebook.strain.name?.trim() || notebook.strain.slug}
                </Link>
                . The optional label below is extra display text. To pick a
                different cultivar, use{" "}
                <strong className="text-[var(--gn-text)]">Details</strong> and
                browse the{" "}
                <Link
                  href="/strains"
                  className="font-medium text-[#ff4500] hover:underline"
                >
                  Strains
                </Link>{" "}
                catalog.
              </p>
            ) : (
              <p className="text-sm text-[var(--gn-text-muted)]">
                Name this notebook. Optional free-text strain label below. To
                link a{" "}
                <Link
                  href="/strains"
                  className="font-medium text-[#ff4500] hover:underline"
                >
                  catalog strain
                </Link>{" "}
                (strain page, breeders, directory filters), open{" "}
                <strong className="text-[var(--gn-text)]">Details</strong> after
                this guide and choose one from Strains.
              </p>
            )}
            <Form.Item
              name="title"
              label={<span className="text-[var(--gn-text)]">Title</span>}
              rules={[{ required: true, message: "Add a title." }]}
            >
              <Input placeholder="e.g. Blue Dream — spring 2026" />
            </Form.Item>
            <Form.Item
              name="customStrainLabel"
              label="Strain label (optional)"
              tooltip="Shown on your notebook. Catalog strain (if any) is set under Details; browse /strains to compare cultivars."
            >
              <Input placeholder="e.g. Blue Dream" />
            </Form.Item>
        </div>

        <div className={step === 2 ? "" : "hidden"} aria-hidden={step !== 2}>
            <p className="mb-5 text-sm leading-relaxed text-[var(--gn-text-muted)]">
              How you run this notebook helps others compare setups. You can
              change this anytime under Details on your notebook page.
            </p>
            <Form.Item
              name="preferredTempUnit"
              label="Temperature unit (weekly readings)"
              tooltip="Week logs and this notebook use this for °C vs °F. Values are stored as °C in the database."
            >
              <Select options={[...TEMP_UNIT_OPTIONS]} />
            </Form.Item>
            <Form.Item
              name="preferredVolumeUnit"
              label="Water / feed volume unit"
              tooltip="Used for structured volume in week entries (liters vs US gallons)."
            >
              <Select options={[...VOLUME_UNIT_OPTIONS]} />
            </Form.Item>
            <Form.Item name="roomType" label="Room type">
              <Select allowClear placeholder="Select…" options={ROOM_OPTIONS} />
            </Form.Item>
            <Form.Item name="wateringType" label="Watering / irrigation">
              <Select
                allowClear
                placeholder="Select…"
                options={WATERING_OPTIONS}
              />
            </Form.Item>
            <Form.Item name="startType" label="How you started">
              <Select allowClear placeholder="Select…" options={START_OPTIONS} />
            </Form.Item>
            <Form.Item name="plantCount" label="Plant count">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="totalLightWatts" label="Total light (watts)">
              <Input placeholder="Optional — for g/W after harvest" />
            </Form.Item>
            <Form.Item
              name="vegLightCycle"
              label="Vegetation light schedule"
              tooltip="Photoperiod during veg (e.g. 18/6). Stored on the notebook, not on weekly entries."
            >
              <Input placeholder="e.g. 18/6" />
            </Form.Item>
            <Form.Item
              name="flowerLightCycle"
              label="Flower light schedule"
              tooltip="Photoperiod during flower (e.g. 12/12)."
            >
              <Input placeholder="e.g. 12/12" />
            </Form.Item>
        </div>

        <div className={step === 3 ? "" : "hidden"} aria-hidden={step !== 3}>
            <label className="block text-sm font-semibold text-[var(--gn-text)]">
              Setup notes
            </label>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Tent size, lights, fans, medium, or nutrient line—anything useful
              for someone reading along.
            </p>
            <Form.Item name="setupNotes" noStyle>
              <Input.TextArea
                rows={6}
                placeholder="Describe your setup…"
                className="mt-2"
              />
            </Form.Item>
        </div>

        <div
          className={step === 4 ? "space-y-5 text-sm leading-relaxed" : "hidden"}
          aria-hidden={step !== 4}
        >
            <h3 className="font-semibold text-[var(--gn-text)]">
              Ready to save?
            </h3>
            <p className="text-[var(--gn-text-muted)]">
              This saves your answers. You can update details anytime from{" "}
              <strong className="text-[var(--gn-text)]">Details</strong> on this
              page—including linking a cultivar from the{" "}
              <Link
                href="/strains"
                className="font-medium text-[#ff4500] hover:underline"
              >
                Strains
              </Link>{" "}
              catalog. Weekly entries use <strong>Add week</strong>.
            </p>
            {notebook ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void skipSetup()}
                className="text-xs font-medium text-[var(--gn-text-muted)] underline decoration-dotted hover:text-[var(--gn-text)]"
              >
                Skip and finish later (only dismisses this guide)
              </button>
            ) : (
              <p className="text-xs text-[var(--gn-text-muted)]">
                Close this window to cancel—no diary is created until you save.
              </p>
            )}
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--gn-divide)] px-1 pb-5 pt-5 sm:px-2 sm:pb-6">
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
              disabled={saving || (step === 1 && !canContinue)}
              onClick={async () => {
                if (step === 1) {
                  try {
                    await form.validateFields(["title"]);
                  } catch {
                    return;
                  }
                }
                setStep((s) => Math.min(STEPS, s + 1));
              }}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              Next <span aria-hidden>›</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void finishSetup()}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              {saving ? "Saving…" : "Save notebook setup"}
            </button>
          )}
        </div>
        </div>
      </Form>
    </NotebookCenteredModal>
  );
}
