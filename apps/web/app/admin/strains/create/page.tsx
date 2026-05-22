"use client";

import { Create, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Button, Form, Input, Select, Switch } from "antd";
import { AdminParentStrainsSelect } from "@/components/admin/admin-parent-strains-select";
import { EffectsTagsSelect } from "@/components/catalog/effects-tags-select";
import { adminSelectPopupProps } from "@/lib/admin-select-props";

export default function AdminStrainCreatePage() {
  const { form, formProps, saveButtonProps } = useForm({
    resource: "strains",
    action: "create",
  });

  const { result: breedersResult } = useList({
    resource: "breeders",
    pagination: { pageSize: 200, currentPage: 1 },
  });
  const breederOptions = (breedersResult?.data ?? []).map((b) => ({
    value: String((b as { id: string }).id),
    label: String((b as { name?: string }).name ?? (b as { id: string }).id),
  }));

  return (
    <Create footerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        form={form}
        layout="vertical"
        initialValues={{ published: true, effects: [], parentStrainIds: [] }}
      >
        <Form.Item
          label="Slug"
          name="slug"
          rules={[
            { required: true },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: "Lowercase letters, numbers, and hyphens only",
            },
          ]}
          extra="Public URL: /strains/your-slug"
        >
          <Input placeholder="e.g. blue-dream" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, min: 2, max: 200 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={6} maxLength={8000} showCount />
        </Form.Item>
        <Form.Item label="Breeder" name="breederId">
          <Select
            allowClear
            placeholder="Optional"
            options={breederOptions}
            showSearch
            optionFilterProp="label"
            {...adminSelectPopupProps()}
          />
        </Form.Item>
        <Form.Item
          label="Parent strains"
          name="parentStrainIds"
          extra="Link to other cultivars already in the catalog (e.g. both parents of a cross)."
        >
          <AdminParentStrainsSelect />
        </Form.Item>
        <Form.Item
          label="Effect tags"
          name="effects"
          extra="Pick standard tags or type your own, then Enter."
        >
          <EffectsTagsSelect />
        </Form.Item>
        <Form.Item label="Effect notes" name="effectsNotes">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Form.Item
          label="Genetics (free text)"
          name="genetics"
          extra="Optional lineage sentence if parents are not in the catalog yet."
        >
          <Input placeholder="e.g. OG Kush × Durban Poison" maxLength={500} />
        </Form.Item>
        <Form.Item label="Chemotype" name="chemotype">
          <Select
            allowClear
            placeholder="Any"
            options={[
              { value: "indica", label: "Indica" },
              { value: "sativa", label: "Sativa" },
              { value: "hybrid", label: "Hybrid" },
            ]}
            {...adminSelectPopupProps()}
          />
        </Form.Item>
        <Form.Item label="Autoflower" name="isAutoflower" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Published" name="published" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" {...saveButtonProps}>
            Create
          </Button>
        </Form.Item>
      </Form>
    </Create>
  );
}
