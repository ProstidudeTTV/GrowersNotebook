"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Button, Form, Input, Switch, Typography } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";

const { Paragraph } = Typography;

export default function AdminBreederEditPage() {
  const params = useParams();
  const id = params.id as string;
  const { form, formProps, saveButtonProps, query } = useForm({
    resource: "breeders",
    action: "edit",
  });

  const slug = (query?.data?.data as { slug?: string } | undefined)?.slug;

  return (
    <Edit
      footerButtons={() => null}
      saveButtonProps={saveButtonProps}
      headerButtons={() =>
        slug ? (
          <Link href={`/breeders/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer">
            <Button type="primary">View public page</Button>
          </Link>
        ) : null
      }
    >
      <Form {...formProps} form={form} layout="vertical">
        <Paragraph type="secondary">
          Slug changes affect public URLs — update only when necessary.
        </Paragraph>
        <Form.Item label="Slug" name="slug">
          <Input />
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
            Save changes
          </Button>
        </Form.Item>
        <Form.Item>
          <Link
            href={`/admin/breeder-reviews?breederId=${id}`}
            className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
          >
            Moderate reviews for this source
          </Link>
        </Form.Item>
      </Form>
    </Edit>
  );
}
