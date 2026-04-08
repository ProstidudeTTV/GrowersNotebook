"use client";

import { Create, useForm } from "@refinedev/antd";
import { Button, Form, Input, Switch } from "antd";

export default function AdminNutrientProductCreatePage() {
  const { formProps, saveButtonProps, form } = useForm({
    resource: "nutrient-products",
    action: "create",
  });

  return (
    <Create saveButtonProps={{ style: { display: "none" } }}>
      <Form {...formProps} form={form} layout="vertical">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Required" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Brand" name="brand">
          <Input />
        </Form.Item>
        <Form.Item label="NPK" name="npk">
          <Input placeholder="e.g. 3-2-4" />
        </Form.Item>
        <Form.Item
          label="Published"
          name="published"
          valuePropName="checked"
          initialValue={true}
        >
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
