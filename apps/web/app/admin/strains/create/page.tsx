"use client";

import { Create, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Button, Form, Input, Select, Switch } from "antd";

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
        initialValues={{ published: true, effects: [] }}
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
        <Form.Item label="Seed source" name="breederId">
          <Select
            allowClear
            placeholder="Optional"
            options={breederOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          label="Tags"
          name="effects"
          extra="Type and press Enter to add each tag"
        >
          <Select mode="tags" placeholder="e.g. citrus, calming" />
        </Form.Item>
        <Form.Item label="Tag notes" name="effectsNotes">
          <Input.TextArea rows={2} maxLength={2000} />
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
