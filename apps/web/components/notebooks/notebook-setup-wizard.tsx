"use client";

import { Form, Input, InputNumber, Select } from "antd";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { NotebookStrainFields } from "@/components/notebook-strain-fields";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";

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

function strainSeed(nb: NotebookDetailPayload): string {
  return (
    nb.strain?.name?.trim() ||
    nb.customStrainLabel?.trim() ||
    nb.title?.trim() ||
    ""
  );
}

export function NotebookSetupWizard({
  open,
  notebook,
  onClose,
  onCompleted,
}: {
  open: boolean;
  notebook: NotebookDetailPayload;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleWatch = Form.useWatch("title", form);

  const displaySeed = useMemo(
    () => `${notebook.id}:${strainSeed(notebook)}`,
    [notebook],
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    form.setFieldsValue({
      title: notebook.title,
      strainId: notebook.strainId ?? "",
      customStrainLabel: notebook.customStrainLabel ?? "",
      roomType: notebook.roomType ?? undefined,
      wateringType: notebook.wateringType ?? undefined,
      startType: notebook.startType ?? undefined,
      plantCount: notebook.plantCount ?? undefined,
      totalLightWatts: notebook.totalLightWatts ?? "",
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
      await patchBody({
        title,
        strainId: v.strainId?.trim() ? v.strainId.trim() : null,
        customStrainLabel: v.customStrainLabel?.trim() || null,
        roomType: v.roomType ?? null,
        wateringType: v.wateringType ?? null,
        startType: v.startType ?? null,
        plantCount: v.plantCount ?? null,
        totalLightWatts: v.totalLightWatts?.trim() || null,
        setupNotes: v.setupNotes?.trim() || null,
        setupWizardCompletedAt: new Date().toISOString(),
      });
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save notebook");
    } finally {
      setSaving(false);
    }
  }

  async function skipSetup() {
    setError(null);
    setSaving(true);
    try {
      await patchBody({
        setupWizardCompletedAt: new Date().toISOString(),
      });
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update notebook");
    } finally {
      setSaving(false);
    }
  }

  const stepTitle = [
    "Title & strain",
    "Grow setup",
    "Setup notes",
    "Publish",
  ][step - 1];

  return (
    <NotebookCenteredModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      maxWidthClassName="max-w-xl"
      title="Set up your notebook"
    >
      <Form form={form} layout="vertical" className="px-4 py-4">
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
          <div className="space-y-2">
            <p className="text-sm text-[var(--gn-text-muted)]">
              Name this grow and link a catalog strain if you have one—readers
              can jump to the strain page from your diary.
            </p>
            <Form.Item
              name="title"
              label={<span className="text-[var(--gn-text)]">Title</span>}
              rules={[{ required: true, message: "Add a title." }]}
            >
              <Input placeholder="e.g. Blue Dream — spring 2026" />
            </Form.Item>
            <NotebookStrainFields displaySeed={displaySeed} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-1">
            <p className="mb-3 text-sm text-[var(--gn-text-muted)]">
              How you run this grow helps others compare setups. You can change
              this anytime on the edit page.
            </p>
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
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <label className="block text-sm font-semibold text-[var(--gn-text)]">
              Setup notes
            </label>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Tent size, lights, fans, medium, or nutrient line—anything useful
              for someone reading along.
            </p>
            <Form.Item name="setupNotes" noStyle>
              <Input.TextArea
                rows={8}
                placeholder="Describe your setup…"
                className="mt-3"
              />
            </Form.Item>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold text-[var(--gn-text)]">
              Ready to save?
            </h3>
            <p className="text-[var(--gn-text-muted)]">
              This stores your answers on the notebook. You can keep editing the
              full form anytime; weekly logs use a separate step-by-step flow
              when you add a week.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void skipSetup()}
              className="text-xs font-medium text-[var(--gn-text-muted)] underline decoration-dotted hover:text-[var(--gn-text)]"
            >
              Skip and finish later (only dismisses this guide)
            </button>
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
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              Next <span aria-hidden>›</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void finishSetup()}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
            >
              {saving ? "Saving…" : "Save notebook setup"}
            </button>
          )}
        </div>
      </Form>
    </NotebookCenteredModal>
  );
}
