"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Typography,
} from "antd";
import { apiFetch } from "@/lib/api-public";
import { NotebookStrainFields } from "@/components/notebook-strain-fields";
import { NotebookSetupWizard } from "@/components/notebooks/notebook-setup-wizard";
import { NotebookWeekWizard } from "@/components/notebooks/notebook-week-wizard";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { needsNotebookSetupWizard } from "@/lib/notebook-wizard";

const { Text } = Typography;

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

type WeekRow = NotebookDetailPayload["weeks"][number];

export function NotebookOwnerEdit({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const [notebook, setNotebook] = useState<NotebookDetailPayload | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [weekWizardOpen, setWeekWizardOpen] = useState(false);
  const [weekWizardMode, setWeekWizardMode] = useState<"create" | "edit">(
    "create",
  );
  const [weekEditTarget, setWeekEditTarget] = useState<WeekRow | null>(null);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const setupAutoOpenedRef = useRef(false);

  const strainDisplaySeed = useMemo(() => {
    if (!notebook) return "";
    return (
      notebook.strain?.name?.trim() ||
      notebook.customStrainLabel?.trim() ||
      ""
    );
  }, [notebook]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      const data = await apiFetch<NotebookDetailPayload>(`/notebooks/${notebookId}`, {
        token: token ?? undefined,
      });
      if (uid !== data.ownerId) {
        setForbidden(true);
        setNotebook(null);
        return;
      }
      setNotebook(data);
      form.setFieldsValue({
        title: data.title,
        strainId: data.strainId ?? "",
        customStrainLabel: data.customStrainLabel ?? "",
        status: data.status,
        plantCount: data.plantCount,
        totalLightWatts: data.totalLightWatts ?? "",
        roomType: data.roomType ?? undefined,
        wateringType: data.wateringType ?? undefined,
        startType: data.startType ?? undefined,
        setupNotes: data.setupNotes ?? "",
        harvestDryWeightG: data.harvestDryWeightG ?? "",
        harvestQualityNotes: data.harvestQualityNotes ?? "",
      });
    } catch {
      setNotebook(null);
    } finally {
      setLoading(false);
    }
  }, [notebookId, form]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setupAutoOpenedRef.current = false;
    setSetupWizardOpen(false);
  }, [notebookId]);

  useEffect(() => {
    if (!notebook || setupAutoOpenedRef.current) return;
    if (needsNotebookSetupWizard(notebook)) {
      setupAutoOpenedRef.current = true;
      setSetupWizardOpen(true);
    }
  }, [notebook]);

  const saveNotebook = async () => {
    const v = await form.validateFields();
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) return;
    await apiFetch(`/notebooks/${notebookId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        title: v.title?.trim(),
        strainId: v.strainId?.trim() ? v.strainId.trim() : null,
        customStrainLabel: v.customStrainLabel?.trim() || null,
        status: v.status,
        plantCount: v.plantCount ?? null,
        totalLightWatts: v.totalLightWatts?.trim() || null,
        roomType: v.roomType ?? null,
        wateringType: v.wateringType ?? null,
        startType: v.startType ?? null,
        setupNotes: v.setupNotes?.trim() || null,
        harvestDryWeightG: v.harvestDryWeightG?.trim() || null,
        harvestQualityNotes: v.harvestQualityNotes?.trim() || null,
      }),
    });
    await load();
  };

  const harvestPanelOpenDefault =
    notebook?.status === "completed" ||
    !!notebook?.harvestDryWeightG?.toString().trim() ||
    !!notebook?.harvestQualityNotes?.toString().trim();

  const nextWeekIndex = useMemo(() => {
    if (!notebook?.weeks?.length) return 1;
    return Math.max(...notebook.weeks.map((w) => w.weekIndex)) + 1;
  }, [notebook]);

  const openNewWeek = () => {
    setWeekWizardMode("create");
    setWeekEditTarget(null);
    setWeekWizardOpen(true);
  };

  const openEditWeek = (w: WeekRow) => {
    setWeekWizardMode("edit");
    setWeekEditTarget(w);
    setWeekWizardOpen(true);
  };

  const deleteWeek = async (weekId: string) => {
    if (!confirm("Delete this week?")) return;
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) return;
    await apiFetch(`/notebooks/${notebookId}/weeks/${weekId}`, {
      method: "DELETE",
      token,
    });
    await load();
  };

  if (loading) {
    return <p className="px-4 py-8 text-[var(--gn-text-muted)]">Loading…</p>;
  }
  if (forbidden || !notebook) {
    return (
      <main className="px-4 py-8">
        <p className="text-[var(--gn-text)]">You can&apos;t edit this notebook.</p>
        <Link href="/notebooks" className="mt-4 inline-block text-[#ff4500]">
          ← Notebooks
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--gn-text)]">Edit notebook</h1>
        <button
          type="button"
          onClick={() => router.push(`/notebooks/${encodeURIComponent(notebookId)}`)}
          className="text-sm text-[#ff4500] hover:underline"
        >
          View public page
        </button>
      </div>

      <Form form={form} layout="vertical" className="mt-6" onFinish={() => void saveNotebook()}>
        <Text strong className="block text-[var(--gn-text)]">
          Basics
        </Text>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <NotebookStrainFields displaySeed={`${notebookId}:${strainDisplaySeed}`} />
        <Form.Item name="status" label="Status">
          <Select options={STATUSES} />
        </Form.Item>

        <Divider />
        <Text strong className="block text-[var(--gn-text)]">
          Growing setup
        </Text>
        <p className="mb-3 text-sm text-[var(--gn-text-muted)]">
          Tent, lights, medium, and environment—document how you run this grow.
        </p>
        <Form.Item
          name="roomType"
          label="Room type"
          tooltip="Where the grow runs: indoor tent, outdoor, or greenhouse."
        >
          <Select allowClear placeholder="Select…" options={ROOM_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="wateringType"
          label="Watering / irrigation"
          tooltip="How water and feed reach the plants."
        >
          <Select allowClear placeholder="Select…" options={WATERING_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="startType"
          label="How you started"
          tooltip="Seeds, clones, or seedlings when this notebook began—matches a first-week story."
        >
          <Select allowClear placeholder="Select…" options={START_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="plantCount"
          label="Plant count"
          tooltip="Number of plants in this run; used with harvest for g/W per plant."
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>
        <Form.Item
          name="totalLightWatts"
          label="Total light (watts)"
          tooltip="Combined draw of grow lighting for efficiency (g/W) after harvest."
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="setupNotes"
          label="Setup notes"
          tooltip="Tent size, lights, fans, substrate, nutrients line—anything helpful for readers."
        >
          <Input.TextArea rows={4} placeholder="Describe your setup…" />
        </Form.Item>

        <Divider />
        <Text strong className="mb-2 block text-[var(--gn-text)]">
          Weekly log
        </Text>
        <div className="mb-2 flex items-center justify-between">
          <Text type="secondary">Week-by-week conditions and notes</Text>
          <Button type="default" onClick={openNewWeek}>
            Add week
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={notebook.weeks}
          pagination={false}
          size="small"
          className="mb-6"
          onRow={(record) => ({
            onClick: () => openEditWeek(record),
          })}
        >
          <Table.Column dataIndex="weekIndex" title="#" width={56} />
          <Table.Column dataIndex="notes" title="Notes" ellipsis />
          <Table.Column
            title=""
            width={140}
            render={(_, w: WeekRow) => (
              <Button
                type="link"
                danger
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteWeek(w.id);
                }}
              >
                Delete
              </Button>
            )}
          />
        </Table>

        <Collapse
          defaultActiveKey={harvestPanelOpenDefault ? ["harvest"] : []}
          items={[
            {
              key: "harvest",
              label: "Harvest and efficiency",
              children: (
                <>
                  <p className="mb-3 text-sm text-[var(--gn-text-muted)]">
                    Add this when you finish—or update dry weight and quality
                    after your final trim. Not needed while the grow is early.
                  </p>
                  <Form.Item
                    name="harvestDryWeightG"
                    label="Harvest dry weight (g)"
                    tooltip="Cured dry weight. You can save early and update later."
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="harvestQualityNotes"
                    label="Harvest quality"
                    tooltip="Density, smell, trim notes, or anything about the finished product."
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Text type="secondary" className="mb-2 block">
                    g/W: {notebook.gPerWatt ?? "—"} · g/W/plant:{" "}
                    {notebook.gPerWattPerPlant ?? "—"}
                  </Text>
                </>
              ),
            },
          ]}
        />

        <Button type="primary" htmlType="submit" className="mt-6">
          Save notebook
        </Button>
      </Form>

      {notebook ? (
        <>
          <NotebookSetupWizard
            open={setupWizardOpen}
            notebook={notebook}
            onClose={() => setSetupWizardOpen(false)}
            onCompleted={() => {
              setSetupWizardOpen(false);
              void load();
            }}
          />
          <NotebookWeekWizard
            open={weekWizardOpen}
            notebookId={notebookId}
            mode={weekWizardMode}
            existingWeek={weekEditTarget}
            nextWeekIndex={nextWeekIndex}
            onClose={() => setWeekWizardOpen(false)}
            onSaved={() => {
              setWeekWizardOpen(false);
              void load();
            }}
          />
        </>
      ) : null}
    </main>
  );
}
