"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";

const { Paragraph } = Typography;

export default function AdminCommunityEditPage() {
  const params = useParams();
  const id = params.id as string;
  const { form, formProps, saveButtonProps } = useForm({
    resource: "communities",
    action: "edit",
  });

  return (
    <Edit
      footerButtons={() => null}
      saveButtonProps={saveButtonProps}
      headerButtons={() => (
        <Link href={`/admin/posts?communityId=${id}`}>
          <Button type="primary">Manage posts in this community</Button>
        </Link>
      )}
    >
      <Form {...formProps} form={form} layout="vertical">
        <Paragraph type="secondary">
          Slug cannot be changed after creation (URLs and links depend on it).
        </Paragraph>
        <Form.Item label="Slug" name="slug">
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, min: 2, max: 120 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={6} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" {...saveButtonProps}>
            Save changes
          </Button>
        </Form.Item>
      </Form>
    </Edit>
  );
}
