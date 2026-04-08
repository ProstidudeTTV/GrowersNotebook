"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from "antd";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";

const { Text } = Typography;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

type WeekRow = NotebookDetailPayload["weeks"][number];

export function NotebookOwnerEdit({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const [notebook, setNotebook] = useState<NotebookDetailPayload | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [weekOpen, setWeekOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<WeekRow | null>(null);
  const [weekForm] = Form.useForm();
  const copyPrevWatch = Form.useWatch(
    "copyNutrientsFromPreviousWeek",
    weekForm,
  );

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
        harvestDryWeightG: v.harvestDryWeightG?.trim() || null,
        harvestQualityNotes: v.harvestQualityNotes?.trim() || null,
      }),
    });
    await load();
  };

  const openNewWeek = () => {
    setEditingWeek(null);
    weekForm.resetFields();
    const nextIdx =
      (notebook?.weeks?.length
        ? Math.max(...notebook.weeks.map((w) => w.weekIndex))
        : 0) + 1;
    weekForm.setFieldsValue({
      weekIndex: nextIdx,
      copyNutrientsFromPreviousWeek: false,
      nutrientsJson: "[]",
      imageUrlsText: "",
    });
    setWeekOpen(true);
  };

  const openEditWeek = (w: WeekRow) => {
    setEditingWeek(w);
    weekForm.setFieldsValue({
      weekIndex: w.weekIndex,
      notes: w.notes ?? "",
      tempC: w.tempC ?? "",
      humidityPct: w.humidityPct ?? "",
      ph: w.ph ?? "",
      ec: w.ec ?? "",
      lightCycle: w.lightCycle ?? "",
      imageUrlsText: (w.imageUrls ?? []).join("\n"),
      nutrientsJson: JSON.stringify(
        (w.nutrients ?? []).map((n) => ({
          productId: (n as { productId?: string }).productId ?? null,
          customLabel: (n as { customLabel?: string }).customLabel ?? null,
          dosage: (n as { dosage?: string }).dosage ?? null,
          sortOrder: (n as { sortOrder?: number }).sortOrder ?? 0,
        })),
        null,
        2,
      ),
    });
    setWeekOpen(true);
  };

  const saveWeek = async () => {
    const v = await weekForm.validateFields();
    const imageUrls = String(v.imageUrlsText ?? "")
      .split(/\r?\n/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    let nutrients: unknown[] = [];
    try {
      nutrients = JSON.parse(String(v.nutrientsJson ?? "[]")) as unknown[];
    } catch {
      return;
    }
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) return;
    if (editingWeek) {
      await apiFetch(`/notebooks/${notebookId}/weeks/${editingWeek.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          notes: v.notes || null,
          tempC: v.tempC || null,
          humidityPct: v.humidityPct || null,
          ph: v.ph || null,
          ec: v.ec || null,
          lightCycle: v.lightCycle || null,
          imageUrls,
          nutrients,
        }),
      });
    } else {
      await apiFetch(`/notebooks/${notebookId}/weeks`, {
        method: "POST",
        token,
        body: JSON.stringify({
          weekIndex: Number(v.weekIndex),
          notes: v.notes || null,
          tempC: v.tempC || null,
          humidityPct: v.humidityPct || null,
          ph: v.ph || null,
          ec: v.ec || null,
          lightCycle: v.lightCycle || null,
          imageUrls,
          copyNutrientsFromPreviousWeek: !!v.copyNutrientsFromPreviousWeek,
          nutrients: v.copyNutrientsFromPreviousWeek ? undefined : nutrients,
        }),
      });
    }
    setWeekOpen(false);
    await load();
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
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="strainId" label="Strain ID (catalog uuid)">
          <Input />
        </Form.Item>
        <Form.Item name="customStrainLabel" label="Custom strain label">
          <Input />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select options={STATUSES} />
        </Form.Item>
        <Form.Item name="plantCount" label="Plant count">
          <InputNumber min={0} className="w-full" />
        </Form.Item>
        <Form.Item name="totalLightWatts" label="Total light watts">
          <Input />
        </Form.Item>
        <Form.Item name="harvestDryWeightG" label="Harvest dry weight (g)">
          <Input />
        </Form.Item>
        <Form.Item name="harvestQualityNotes" label="Harvest quality">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Text type="secondary" className="mb-2 block">
          g/W: {notebook.gPerWatt ?? "—"} · g/W/plant:{" "}
          {notebook.gPerWattPerPlant ?? "—"}
        </Text>
        <Button type="primary" htmlType="submit">
          Save notebook
        </Button>
      </Form>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <Text strong>Weeks</Text>
          <Button type="default" onClick={openNewWeek}>
            Add week
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={notebook.weeks}
          pagination={false}
          size="small"
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
      </div>

      <Modal
        title={editingWeek ? `Week ${editingWeek.weekIndex}` : "New week"}
        open={weekOpen}
        onCancel={() => setWeekOpen(false)}
        onOk={() => void saveWeek()}
        width={640}
        destroyOnClose
      >
        <Form form={weekForm} layout="vertical">
          <Form.Item
            name="weekIndex"
            label="Week #"
            rules={[{ required: !editingWeek }]}
          >
            <InputNumber min={1} className="w-full" disabled={!!editingWeek} />
          </Form.Item>
          {!editingWeek ? (
            <Form.Item
              name="copyNutrientsFromPreviousWeek"
              valuePropName="checked"
            >
              <Checkbox>Copy nutrients from previous week</Checkbox>
            </Form.Item>
          ) : null}
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="tempC" label="Temp °C">
            <Input />
          </Form.Item>
          <Form.Item name="humidityPct" label="Humidity %">
            <Input />
          </Form.Item>
          <Form.Item name="ph" label="pH">
            <Input />
          </Form.Item>
          <Form.Item name="ec" label="EC">
            <Input />
          </Form.Item>
          <Form.Item name="lightCycle" label="Light cycle">
            <Input />
          </Form.Item>
          <Form.Item name="imageUrlsText" label="Image URLs (line break)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="nutrientsJson" label="Nutrients JSON">
            <Input.TextArea
              rows={5}
              disabled={!editingWeek && !!copyPrevWatch}
            />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
