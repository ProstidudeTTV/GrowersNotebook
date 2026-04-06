"use client";

import { Create, useForm } from "@refinedev/antd";
import { Button, Form, Input } from "antd";

export default function AdminCommunityCreatePage() {
  const { form, formProps, saveButtonProps } = useForm({
    resource: "communities",
    action: "create",
  });

  return (
    <Create footerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form {...formProps} form={form} layout="vertical">
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
          extra="Shown in the URL: /community/your-slug"
        >
          <Input placeholder="e.g. indoor-growing" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, min: 2, max: 120 }]}
        >
          <Input placeholder="Display name" />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={5} placeholder="Shown on the community page" maxLength={2000} showCount />
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
