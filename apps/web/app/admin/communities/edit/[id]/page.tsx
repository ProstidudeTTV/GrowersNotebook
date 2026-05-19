"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Button, Form, Input, message, Select, Space, Typography } from "antd";
import {
  COMMUNITY_ICON_KEYS,
  COMMUNITY_ICON_LABELS,
} from "@/lib/community-icon-keys";
import { uploadCommunityBanner } from "@/lib/upload-community-banner";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

const { Paragraph } = Typography;

export default function AdminCommunityEditPage() {
  const params = useParams();
  const id = params.id as string;
  const { form, formProps, saveButtonProps } = useForm({
    resource: "communities",
    action: "edit",
  });

  const bannerUrl = Form.useWatch<string | null | undefined>("bannerUrl", form);
  const slug = Form.useWatch<string | undefined>("slug", form);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickBanner = async (file: File | null) => {
    if (!file) return;
    if (!slug) {
      void message.error("Slug must be loaded before uploading a banner.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCommunityBanner(file, slug);
      form.setFieldValue("bannerUrl", url);
      void message.success("Banner uploaded.");
    } catch (e) {
      void message.error(
        e instanceof Error ? e.message : "Could not upload banner.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
        <Form.Item
          label="Icon"
          name="iconKey"
          extra="Optional — directory, guest landing, sidebar."
        >
          <Select
            allowClear
            placeholder="Default (initial letter)"
            options={COMMUNITY_ICON_KEYS.map((k) => ({
              value: k,
              label: COMMUNITY_ICON_LABELS[k],
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Community Banner"
          extra="Wide hero image shown on the community page. JPEG / PNG / WebP / GIF, max 5 MB. Leave empty to use no banner."
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt="Community banner preview"
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: 720,
                  maxHeight: 220,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            ) : (
              <Typography.Text type="secondary">
                No banner uploaded yet.
              </Typography.Text>
            )}
            <Space wrap>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  void handlePickBanner(f);
                }}
                disabled={uploading}
              />
              {bannerUrl ? (
                <Button
                  type="default"
                  size="small"
                  disabled={uploading}
                  onClick={() => form.setFieldValue("bannerUrl", null)}
                >
                  Remove banner
                </Button>
              ) : null}
              {uploading ? (
                <Typography.Text type="secondary">Uploading…</Typography.Text>
              ) : null}
            </Space>
          </Space>
        </Form.Item>
        <Form.Item name="bannerUrl" hidden>
          <Input />
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
