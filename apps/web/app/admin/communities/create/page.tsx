"use client";

import { Create, useForm } from "@refinedev/antd";
import { Button, Form, Input, message, Select, Space, Typography } from "antd";
import {
  COMMUNITY_ICON_KEYS,
  COMMUNITY_ICON_LABELS,
} from "@/lib/community-icon-keys";
import { uploadCommunityBanner } from "@/lib/upload-community-banner";
import { useRef, useState } from "react";

export default function AdminCommunityCreatePage() {
  const { form, formProps, saveButtonProps } = useForm({
    resource: "communities",
    action: "create",
  });

  const bannerUrl = Form.useWatch<string | null | undefined>("bannerUrl", form);
  const slug = Form.useWatch<string | undefined>("slug", form);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickBanner = async (file: File | null) => {
    if (!file) return;
    const slugValue = (slug ?? "").trim();
    if (!slugValue) {
      void message.error("Enter a slug first; the banner is stored under it.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCommunityBanner(file, slugValue);
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
        <Form.Item
          label="Icon"
          name="iconKey"
          extra="Optional — shown in the directory, guest landing, and sidebar."
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
          extra="Optional wide hero image. JPEG / PNG / WebP / GIF, max 5 MB. Enter the slug above before uploading."
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
            Create
          </Button>
        </Form.Item>
      </Form>
    </Create>
  );
}
