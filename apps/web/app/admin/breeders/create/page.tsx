"use client";

import { Create, useForm } from "@refinedev/antd";
import { Button, Form, Input, Switch } from "antd";

export default function AdminBreederCreatePage() {
  const { form, formProps, saveButtonProps } = useForm({
    resource: "breeders",
    action: "create",
  });

  return (
    <Create footerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        form={form}
        layout="vertical"
        initialValues={{ published: true }}
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
          extra="Public URL: /breeders/your-slug"
        >
          <Input placeholder="e.g. example-seeds" autoComplete="off" />
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
        <Form.Item label="Website" name="website">
          <Input placeholder="https://…" />
        </Form.Item>
        <Form.Item label="Country / region" name="country">
          <Input />
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
