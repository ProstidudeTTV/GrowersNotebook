"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Button, Descriptions, Form, Input, InputNumber, Switch, Typography } from "antd";
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

  const data = query?.data?.data as
    | {
        slug?: string;
        id?: string;
        createdAt?: string;
        updatedAt?: string;
        reviewCount?: number;
        avgRating?: string | null;
      }
    | undefined;

  const slug = data?.slug;

  return (
    <Edit
      footerButtons={() => null}
      saveButtonProps={saveButtonProps}
      headerButtons={() =>
        slug ? (
          <Link
            href={`/breeders/${encodeURIComponent(slug)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button type="primary">View public page</Button>
          </Link>
        ) : null
      }
    >
      {data?.id ? (
        <Descriptions bordered size="small" column={1} className="mb-6">
          <Descriptions.Item label="ID (read-only)">
            <Typography.Text copyable>{data.id}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {data.createdAt
              ? new Date(data.createdAt).toLocaleString()
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {data.updatedAt
              ? new Date(data.updatedAt).toLocaleString()
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      ) : null}

      <Form {...formProps} form={form} layout="vertical">
        <Paragraph type="secondary">
          Slug changes affect public URLs — update only when necessary. Review
          counts and average rating are normally updated automatically from
          reviews; you can override them here for corrections.
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
        <Form.Item
          label="Review count"
          name="reviewCount"
          extra="Usually maintained by the system when reviews are added or removed."
        >
          <InputNumber min={0} className="w-full max-w-xs" />
        </Form.Item>
        <Form.Item
          label="Average rating"
          name="avgRating"
          extra="1–5 scale; leave empty to clear. Normally computed from reviews."
        >
          <InputNumber min={0} max={5} step={0.01} className="w-full max-w-xs" />
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
            Moderate reviews for this breeder
          </Link>
        </Form.Item>
      </Form>
    </Edit>
  );
}
