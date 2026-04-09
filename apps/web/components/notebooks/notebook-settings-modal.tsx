"use client";

import { Form, Input, InputNumber, Select } from "antd";
import { useEffect, useState } from "react";
import Link from "next/link";
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
}: {
  open: boolean;
  notebook: NotebookDetailPayload;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    form.setFieldsValue({
      title: notebook.title,
      customStrainLabel: notebook.customStrainLabel ?? "",
      status: notebook.status,
      preferredTempUnit: normalizeTempUnit(notebook.preferredTempUnit),
      preferredVolumeUnit: normalizeVolumeUnit(notebook.preferredVolumeUnit),
      plantCount: notebook.plantCount ?? undefined,
      totalLightWatts: notebook.totalLightWatts ?? "",
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

  return (
    <NotebookCenteredModal
      open={open}
      title="Notebook details"
      onClose={() => (!saving ? onClose() : undefined)}
      maxWidthClassName="max-w-4xl"
    >
      <Form form={form} layout="vertical" className="px-5 py-4">
        {notebook.strain?.slug ? (
          <p className="mb-3 text-sm text-[var(--gn-text-muted)]">
            Catalog strain:{" "}
            <Link
              href={`/strains/${encodeURIComponent(notebook.strain.slug)}`}
              className="font-medium text-[#ff4500] hover:underline"
            >
              {notebook.strain.name?.trim() || notebook.strain.slug}
            </Link>
            <span className="ml-1 text-xs">
              (change via admin if you need a different catalog link)
            </span>
          </p>
        ) : null}
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="customStrainLabel"
          label="Strain label"
          tooltip="Shown on your diary; optional if you use a catalog strain name."
        >
          <Input placeholder="Free-text strain name" />
        </Form.Item>
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
        <Form.Item name="setupNotes" label="Setup notes">
          <Input.TextArea rows={4} />
        </Form.Item>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-[var(--gn-divide)] px-4 py-2 text-sm text-[var(--gn-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </Form>
    </NotebookCenteredModal>
  );
}
