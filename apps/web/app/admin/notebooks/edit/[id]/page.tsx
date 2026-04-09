"use client";

import { Edit } from "@refinedev/antd";
import {
  App as AntdApp,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { adminAxios } from "@/lib/admin-axios";
import { NotebookStrainFields } from "@/components/notebook-strain-fields";

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
  ppm: string | null;
  waterNotes: string | null;
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
  strain: { slug: string; name: string | null } | null;
  status: string;
  plantCount: number | null;
  totalLightWatts: string | null;
  harvestDryWeightG: string | null;
  harvestQualityNotes: string | null;
  gPerWatt: string | null;
  gPerWattPerPlant: string | null;
  roomType: string | null;
  wateringType: string | null;
  startType: string | null;
  setupNotes: string | null;
  vegLightCycle: string | null;
  flowerLightCycle: string | null;
  weeks: WeekRow[];
};

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

  const strainDisplaySeed = useMemo(() => {
    if (!notebook) return "";
    return (
      notebook.strain?.name?.trim() ||
      notebook.customStrainLabel?.trim() ||
      ""
    );
  }, [notebook]);

  const harvestPanelOpenDefault =
    notebook?.status === "completed" ||
    !!notebook?.harvestDryWeightG?.toString().trim() ||
    !!notebook?.harvestQualityNotes?.toString().trim();

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
        roomType: data.roomType ?? undefined,
        wateringType: data.wateringType ?? undefined,
        startType: data.startType ?? undefined,
        setupNotes: data.setupNotes ?? "",
        vegLightCycle: data.vegLightCycle ?? "",
        flowerLightCycle: data.flowerLightCycle ?? "",
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
        roomType: v.roomType ?? null,
        wateringType: v.wateringType ?? null,
        startType: v.startType ?? null,
        setupNotes: v.setupNotes?.trim() || null,
        vegLightCycle: v.vegLightCycle?.trim() || null,
        flowerLightCycle: v.flowerLightCycle?.trim() || null,
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
      ppm: "",
      waterNotes: "",
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
      ppm: w.ppm ?? "",
      waterNotes: w.waterNotes ?? "",
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
            ppm: v.ppm || null,
            waterNotes: v.waterNotes || null,
            lightCycle: null,
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
          ppm: v.ppm || null,
          waterNotes: v.waterNotes || null,
          lightCycle: null,
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
        <Text strong>Basics</Text>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <NotebookStrainFields displaySeed={`${id}:${strainDisplaySeed}`} />
        <Form.Item name="status" label="Status">
          <Select options={STATUSES} />
        </Form.Item>

        <Divider />
        <Text strong>Growing setup</Text>
        <Form.Item
          name="roomType"
          label="Room type"
          tooltip="Indoor tent, outdoor, or greenhouse."
        >
          <Select allowClear placeholder="Select…" options={ROOM_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="wateringType"
          label="Watering / irrigation"
          tooltip="How water and nutrients reach plants."
        >
          <Select allowClear placeholder="Select…" options={WATERING_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="startType"
          label="How grow started"
          tooltip="Seed, clone, or seedling."
        >
          <Select allowClear placeholder="Select…" options={START_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="plantCount"
          label="Plant count"
          tooltip="Plants in this run; used for g/W per plant."
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>
        <Form.Item
          name="totalLightWatts"
          label="Total light (watts)"
          tooltip="Combined lighting for g/W after harvest."
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="vegLightCycle"
          label="Vegetation light schedule"
          tooltip="Notebook-level (e.g. 18/6), not stored on individual weeks."
        >
          <Input placeholder="e.g. 18/6" />
        </Form.Item>
        <Form.Item
          name="flowerLightCycle"
          label="Flower light schedule"
          tooltip="e.g. 12/12"
        >
          <Input placeholder="e.g. 12/12" />
        </Form.Item>
        <Form.Item
          name="setupNotes"
          label="Setup notes"
          tooltip="Tent, lights, medium, equipment."
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        <Divider />
        <Text strong>Weekly log</Text>
        <div className="mb-2 flex items-center justify-between">
          <Text type="secondary">Weeks</Text>
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

        <Collapse
          defaultActiveKey={harvestPanelOpenDefault ? ["harvest"] : []}
          items={[
            {
              key: "harvest",
              label: "Harvest and efficiency",
              children: (
                <>
                  <Form.Item
                    name="harvestDryWeightG"
                    label="Harvest dry weight (g)"
                    tooltip="Cured dry weight; can update later."
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="harvestQualityNotes"
                    label="Harvest quality notes"
                    tooltip="Trim, cure, density, aroma."
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Text type="secondary" className="mb-4 block">
                    g/w: {notebook.gPerWatt ?? "—"} · g/w/plant:{" "}
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
            tooltip="Sequential week for this notebook."
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
          <Form.Item name="notes" label="Notes" tooltip="Weekly narrative.">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="tempC" label="Temp (°C)" tooltip="Canopy or air.">
            <Input />
          </Form.Item>
          <Form.Item name="humidityPct" label="Humidity %" tooltip="RH in grow space.">
            <Input />
          </Form.Item>
          <Form.Item name="ph" label="pH" tooltip="Solution or runoff.">
            <Input />
          </Form.Item>
          <Form.Item name="ec" label="EC" tooltip="Feed strength.">
            <Input />
          </Form.Item>
          <Form.Item name="ppm" label="PPM / TDS" tooltip="Optional TDS.">
            <Input />
          </Form.Item>
          <Form.Item
            name="waterNotes"
            label="Watering / feed notes"
            tooltip="Volume, frequency, runoff."
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="imageUrlsText"
            label="Image URLs (one per line, max 8)"
            tooltip="HTTPS URLs only."
          >
            <Input.TextArea rows={3} placeholder="https://…" />
          </Form.Item>
          <Form.Item
            name="nutrientsJson"
            label="Nutrients JSON"
            tooltip="Array of productId, customLabel, dosage, sortOrder."
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
