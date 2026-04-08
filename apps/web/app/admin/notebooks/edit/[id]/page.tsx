"use client";

import { Edit } from "@refinedev/antd";
import {
  App as AntdApp,
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
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminAxios } from "@/lib/admin-axios";

const { Text } = Typography;

type NutrientLine = {
  productId?: string | null;
  customLabel?: string | null;
  dosage?: string | null;
  sortOrder?: number;
};

type WeekRow = {
  id: string;
  notebookId: string;
  weekIndex: number;
  notes: string | null;
  tempC: string | null;
  humidityPct: string | null;
  ph: string | null;
  ec: string | null;
  lightCycle: string | null;
  imageUrls: string[];
  nutrients: Record<string, unknown>[];
};

type NotebookDetail = {
  id: string;
  ownerId: string;
  title: string;
  strainId: string | null;
  customStrainLabel: string | null;
  status: string;
  plantCount: number | null;
  totalLightWatts: string | null;
  harvestDryWeightG: string | null;
  harvestQualityNotes: string | null;
  gPerWatt: string | null;
  gPerWattPerPlant: string | null;
  weeks: WeekRow[];
};

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function AdminNotebookEditPage() {
  const params = useParams();
  const id = params.id as string;
  const { message } = AntdApp.useApp();
  const [notebook, setNotebook] = useState<NotebookDetail | null>(null);
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
      const { data } = await adminAxios.get<NotebookDetail>(`/notebooks/${id}`);
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
      message.error("Failed to load notebook");
      setNotebook(null);
    } finally {
      setLoading(false);
    }
  }, [id, form, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNotebook = async () => {
    const v = await form.validateFields();
    try {
      await adminAxios.patch(`/notebooks/${id}`, {
        title: v.title?.trim(),
        strainId: v.strainId?.trim() ? v.strainId.trim() : null,
        customStrainLabel: v.customStrainLabel?.trim() || null,
        status: v.status,
        plantCount: v.plantCount ?? null,
        totalLightWatts: v.totalLightWatts?.trim() || null,
        harvestDryWeightG: v.harvestDryWeightG?.trim() || null,
        harvestQualityNotes: v.harvestQualityNotes?.trim() || null,
      });
      message.success("Notebook saved");
      await load();
    } catch {
      message.error("Save failed");
    }
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
      notes: "",
      tempC: "",
      humidityPct: "",
      ph: "",
      ec: "",
      lightCycle: "",
      imageUrlsText: "",
      nutrientsJson: "[]",
      copyNutrientsFromPreviousWeek: false,
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
    let nutrients: NutrientLine[] = [];
    try {
      nutrients = JSON.parse(String(v.nutrientsJson ?? "[]")) as NutrientLine[];
    } catch {
      message.error("Nutrients must be valid JSON array");
      return;
    }
    try {
      if (editingWeek) {
        await adminAxios.patch(
          `/notebooks/${id}/weeks/${editingWeek.id}`,
          {
            notes: v.notes || null,
            tempC: v.tempC || null,
            humidityPct: v.humidityPct || null,
            ph: v.ph || null,
            ec: v.ec || null,
            lightCycle: v.lightCycle || null,
            imageUrls,
            nutrients,
          },
        );
        message.success("Week updated");
      } else {
        await adminAxios.post(`/notebooks/${id}/weeks`, {
          weekIndex: Number(v.weekIndex),
          notes: v.notes || null,
          tempC: v.tempC || null,
          humidityPct: v.humidityPct || null,
          ph: v.ph || null,
          ec: v.ec || null,
          lightCycle: v.lightCycle || null,
          imageUrls,
          copyNutrientsFromPreviousWeek: !!v.copyNutrientsFromPreviousWeek,
          nutrients:
            v.copyNutrientsFromPreviousWeek ? undefined : nutrients,
        });
        message.success("Week added");
      }
      setWeekOpen(false);
      await load();
    } catch {
      message.error("Week save failed");
    }
  };

  const deleteWeek = async (weekId: string) => {
    if (!confirm("Delete this week?")) return;
    try {
      await adminAxios.delete(`/notebooks/${id}/weeks/${weekId}`);
      message.success("Week deleted");
      await load();
    } catch {
      message.error("Delete failed");
    }
  };

  if (loading || !notebook) {
    return (
      <Edit title="Notebook" saveButtonProps={{ style: { display: "none" } }}>
        <Text type="secondary">Loading…</Text>
      </Edit>
    );
  }

  return (
    <Edit
      title={`Notebook: ${notebook.title}`}
      saveButtonProps={{ style: { display: "none" } }}
    >
      <Form form={form} layout="vertical" onFinish={() => saveNotebook()}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="strainId" label="Strain ID">
          <Input placeholder="uuid or empty" />
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
        <Form.Item name="totalLightWatts" label="Total light (watts)">
          <Input />
        </Form.Item>
        <Form.Item name="harvestDryWeightG" label="Harvest dry weight (g)">
          <Input />
        </Form.Item>
        <Form.Item name="harvestQualityNotes" label="Harvest quality notes">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Text type="secondary" className="mb-4 block">
          g/w: {notebook.gPerWatt ?? "—"} · g/w/plant:{" "}
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
          <Table.Column
            dataIndex="notes"
            title="Notes"
            ellipsis
            render={(t: string | null) => (t ? `${t.slice(0, 80)}…` : "—")}
          />
          <Table.Column
            title=""
            width={160}
            render={(_, w: WeekRow) => (
              <span className="flex gap-2">
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditWeek(w);
                  }}
                >
                  Edit
                </Button>
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
              </span>
            )}
          />
        </Table>
      </div>

      <Modal
        title={editingWeek ? `Edit week ${editingWeek.weekIndex}` : "New week"}
        open={weekOpen}
        onCancel={() => setWeekOpen(false)}
        onOk={() => void saveWeek()}
        width={720}
        destroyOnClose
      >
        <Form form={weekForm} layout="vertical">
          <Form.Item
            name="weekIndex"
            label="Week number"
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
          <Form.Item name="tempC" label="Temp (°C)">
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
            <Input placeholder="e.g. 18/6" />
          </Form.Item>
          <Form.Item
            name="imageUrlsText"
            label="Image URLs (one per line, max 8)"
          >
            <Input.TextArea rows={3} placeholder="https://…" />
          </Form.Item>
          <Form.Item
            name="nutrientsJson"
            label="Nutrients JSON"
            extra="[{&quot;productId&quot;:null,&quot;customLabel&quot;:&quot;…&quot;,&quot;dosage&quot;:&quot;…&quot;,&quot;sortOrder&quot;:0}]"
          >
            <Input.TextArea
              rows={6}
              disabled={!editingWeek && !!copyPrevWatch}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Edit>
  );
}
