"use client";

import { Create } from "@refinedev/antd";
import { App as AntdApp, Form, Input, Select } from "antd";
import { useRouter } from "next/navigation";
import { adminAxios } from "@/lib/admin-axios";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function AdminNotebookCreatePage() {
  const { message } = AntdApp.useApp();
  const router = useRouter();
  const [form] = Form.useForm();

  return (
    <Create title="Create notebook" saveButtonProps={{ style: { display: "none" } }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={async (v: {
          ownerId: string;
          title: string;
          strainId?: string;
          customStrainLabel?: string;
          status?: string;
        }) => {
          try {
            const { data } = await adminAxios.post<{ id: string }>("/notebooks", {
              ownerId: v.ownerId.trim(),
              title: v.title.trim(),
              strainId: v.strainId?.trim() || null,
              customStrainLabel: v.customStrainLabel?.trim() || null,
              status: v.status ?? "active",
            });
            message.success("Notebook created");
            router.push(`/admin/notebooks/edit/${data.id}`);
          } catch {
            message.error("Could not create notebook");
          }
        }}
      >
        <Form.Item
          name="ownerId"
          label="Owner profile ID"
          rules={[{ required: true, message: "User UUID" }]}
        >
          <Input placeholder="profiles.id / auth user id" />
        </Form.Item>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Title required" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="strainId" label="Strain ID (catalog, optional)">
          <Input placeholder="uuid" />
        </Form.Item>
        <Form.Item name="customStrainLabel" label="Custom strain label">
          <Input />
        </Form.Item>
        <Form.Item name="status" label="Status" initialValue="active">
          <Select options={STATUSES} />
        </Form.Item>
        <Form.Item>
          <button
            type="submit"
            className="rounded-md bg-[#1677ff] px-4 py-2 text-white"
          >
            Create
          </button>
        </Form.Item>
      </Form>
    </Create>
  );
}
