"use client";

import { Edit, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Button, Form, Input, Select, Switch, Typography } from "antd";
import Link from "next/link";

const { Paragraph } = Typography;

export default function AdminStrainEditPage() {
  const { form, formProps, saveButtonProps, query } = useForm({
    resource: "strains",
    action: "edit",
  });

  const { result: breedersResult } = useList({
    resource: "breeders",
    pagination: { pageSize: 200, currentPage: 1 },
  });
  const breederOptions = (breedersResult?.data ?? []).map((b) => ({
    value: String((b as { id: string }).id),
    label: String((b as { name?: string }).name ?? (b as { id: string }).id),
  }));

  const slug = (query?.data?.data as { slug?: string } | undefined)?.slug;

  return (
    <Edit
      footerButtons={() => null}
      saveButtonProps={saveButtonProps}
      headerButtons={() =>
        slug ? (
          <Link href={`/strains/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer">
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
        <Form.Item label="Breeder" name="breederId">
          <Select
            allowClear
            placeholder="None"
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
          <Select mode="tags" placeholder="Tags" />
        </Form.Item>
        <Form.Item label="Tag notes" name="effectsNotes">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Form.Item label="Published" name="published" valuePropName="checked">
          <Switch />
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
