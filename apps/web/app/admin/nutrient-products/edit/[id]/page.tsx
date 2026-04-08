"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Button, Form, Input, Switch } from "antd";
import { useEffect } from "react";

export default function AdminNutrientProductEditPage() {
  const { formProps, saveButtonProps, form, query } = useForm({
    resource: "nutrient-products",
    action: "edit",
  });

  const record = query?.data?.data as
    | {
        name?: string;
        brand?: string | null;
        npk?: string | null;
        published?: boolean;
      }
    | undefined;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      name: record.name,
      brand: record.brand ?? "",
      npk: record.npk ?? "",
      published: record.published !== false,
    });
  }, [record, form]);

  return (
    <Edit saveButtonProps={{ style: { display: "none" } }}>
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
          <Input />
        </Form.Item>
        <Form.Item label="Published" name="published" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" {...saveButtonProps}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Edit>
  );
}
