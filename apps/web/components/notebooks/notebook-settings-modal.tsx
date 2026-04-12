"use client";

import { Form, Input, InputNumber, Select } from "antd";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { NotebookStrainFields } from "@/components/notebook-strain-fields";
import { NotebookCenteredModal } from "@/components/notebooks/notebook-centered-modal";
import {
  normalizeTempUnit,
  normalizeVolumeUnit,
  TEMP_UNIT_OPTIONS,
  VOLUME_UNIT_OPTIONS,
} from "@/lib/notebook-units";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

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

export function NotebookSettingsModal({
  open,
  notebook,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  notebook: NotebookDetailPayload;
  onClose: () => void;
  onSaved: () => void;
  /** Called after the notebook is deleted from the API (navigate away). */
  onDeleted?: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    form.setFieldsValue({
      title: notebook.title,
      strainId: notebook.strainId ?? "",
      customStrainLabel: notebook.customStrainLabel ?? "",
      status: notebook.status,
      preferredTempUnit: normalizeTempUnit(notebook.preferredTempUnit),
      preferredVolumeUnit: normalizeVolumeUnit(notebook.preferredVolumeUnit),
      plantCount: notebook.plantCount ?? undefined,
      totalLightWatts: notebook.totalLightWatts ?? "",
      vegLightCycle: notebook.vegLightCycle ?? "",
      flowerLightCycle: notebook.flowerLightCycle ?? "",
      roomType: notebook.roomType ?? undefined,
      wateringType: notebook.wateringType ?? undefined,
      startType: notebook.startType ?? undefined,
      setupNotes: notebook.setupNotes ?? "",
    });
  }, [open, notebook, form]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const v = await form.validateFields();
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to save.");
      await apiFetch(`/notebooks/${notebook.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          title: v.title?.trim(),
          strainId: v.strainId?.trim() ? v.strainId.trim() : null,
          customStrainLabel: v.customStrainLabel?.trim() || null,
          status: v.status,
          preferredTempUnit: normalizeTempUnit(v.preferredTempUnit),
          preferredVolumeUnit: normalizeVolumeUnit(v.preferredVolumeUnit),
          plantCount: v.plantCount ?? null,
          totalLightWatts: v.totalLightWatts?.trim() || null,
          roomType: v.roomType ?? null,
          wateringType: v.wateringType ?? null,
          startType: v.startType ?? null,
          setupNotes: v.setupNotes?.trim() || null,
        }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotebook() {
    if (
      !window.confirm(
        `Delete “${notebook.title.trim()}”? All weeks and comments on this diary will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to delete.");
      await apiFetch(`/notebooks/${notebook.id}`, { method: "DELETE", token });
      onClose();
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete diary");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <NotebookCenteredModal
      open={open}
      title="Notebook details"
      onClose={() => (!saving ? onClose() : undefined)}
    >
      <Form
        form={form}
        layout="vertical"
        size="middle"
        className="px-5 py-5 sm:px-6 sm:py-6"
      >
        <p className="mb-6 text-sm leading-relaxed text-[var(--gn-text-muted)]">
          {notebook.strain?.slug ? (
            <>
              Catalog strain:{" "}
              <Link
                href={`/strains/${encodeURIComponent(notebook.strain.slug)}`}
                className="font-medium text-[#ff4500] hover:underline"
              >
                {notebook.strain.name?.trim() || notebook.strain.slug}
              </Link>
              . Browse all cultivars in the{" "}
              <Link
                href="/strains"
                className="font-medium text-[#ff4500] hover:underline"
              >
                Strains
              </Link>{" "}
              catalog; use search below to link a different entry.
            </>
          ) : (
            <>
              Link this diary to a cultivar with catalog search below, or open
              the{" "}
              <Link
                href="/strains"
                className="font-medium text-[#ff4500] hover:underline"
              >
                Strains
              </Link>{" "}
              directory to browse.
            </>
          )}
        </p>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <NotebookStrainFields
          displaySeed={
            notebook.strain?.name?.trim() ||
            notebook.customStrainLabel?.trim() ||
            ""
          }
        />
        <Form.Item name="status" label="Status">
          <Select options={STATUSES} />
        </Form.Item>
        <Form.Item
          name="preferredTempUnit"
          label="Temperature unit (readings)"
          tooltip="Applies to week environment temps (stored as °C; displayed/edited in your choice)."
        >
          <Select options={[...TEMP_UNIT_OPTIONS]} />
        </Form.Item>
        <Form.Item
          name="preferredVolumeUnit"
          label="Water / feed volume unit"
          tooltip="Structured volume in week entries uses liters or US gallons."
        >
          <Select options={[...VOLUME_UNIT_OPTIONS]} />
        </Form.Item>
        <Form.Item name="roomType" label="Room type">
          <Select allowClear placeholder="Select…" options={ROOM_OPTIONS} />
        </Form.Item>
        <Form.Item name="wateringType" label="Watering / irrigation">
          <Select allowClear placeholder="Select…" options={WATERING_OPTIONS} />
        </Form.Item>
        <Form.Item name="startType" label="How you started">
          <Select allowClear placeholder="Select…" options={START_OPTIONS} />
        </Form.Item>
        <Form.Item name="plantCount" label="Plant count">
          <InputNumber min={0} className="w-full" />
        </Form.Item>
        <Form.Item name="totalLightWatts" label="Total light (watts)">
          <Input />
        </Form.Item>
        <Form.Item
          name="vegLightCycle"
          label="Vegetation light schedule"
          tooltip="Photoperiod during veg (e.g. 18/6). Applies to the whole notebook, not individual weeks."
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
        <Form.Item name="setupNotes" label="Setup notes">
          <Input.TextArea rows={4} />
        </Form.Item>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="mt-8 flex justify-end gap-2 border-t border-[var(--gn-divide)] pt-6">
          <button
            type="button"
            disabled={saving || deleting}
            onClick={onClose}
            className="rounded-lg border border-[var(--gn-divide)] px-4 py-1.5 text-sm text-[var(--gn-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => void save()}
            className="rounded-full bg-emerald-500 px-5 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {onDeleted ? (
          <div className="mt-8 border-t border-[var(--gn-divide)] pb-5 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400/90">
              Danger zone
            </p>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Permanently delete this grow diary and all of its weekly entries.
            </p>
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => void deleteNotebook()}
              className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-45"
            >
              {deleting ? "Deleting…" : "Delete diary"}
            </button>
          </div>
        ) : null}
      </Form>
    </NotebookCenteredModal>
  );
}
