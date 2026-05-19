"use client";

import { Create, useForm } from "@refinedev/antd";
import {
  Button,
  Divider,
  Form,
  Input,
  message,
  Select,
  Space,
  Typography,
} from "antd";
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
  const iconUrl = Form.useWatch<string | null | undefined>("iconUrl", form);
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
        {/* ── Basic Info ── */}
        <Divider orientation="left" orientationMargin={0}>
          <Typography.Text
            type="secondary"
            className="text-xs font-bold uppercase tracking-widest"
          >
            Basic Info
          </Typography.Text>
        </Divider>

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
          extra="Used in the URL: /community/your-slug — cannot be changed after creation."
        >
          <Input placeholder="e.g. indoor-growing" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, min: 2, max: 120 }]}
        >
          <Input placeholder="Display name shown on the community page" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea
            rows={5}
            placeholder="What is this community about? Shown on the community page."
            maxLength={2000}
            showCount
          />
        </Form.Item>

        {/* ── Appearance ── */}
        <Divider orientation="left" orientationMargin={0} className="!mt-8">
          <Typography.Text
            type="secondary"
            className="text-xs font-bold uppercase tracking-widest"
          >
            Appearance
          </Typography.Text>
        </Divider>

        <Form.Item
          label="Icon style"
          name="iconKey"
          extra="Optional predefined icon shown in the directory, sidebar, and guest landing."
        >
          <Select
            allowClear
            placeholder="Default (initial letter of name)"
            options={COMMUNITY_ICON_KEYS.map((k) => ({
              value: k,
              label: COMMUNITY_ICON_LABELS[k],
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Icon image URL"
          name="iconUrl"
          extra='Optional custom icon image. Paste a direct image URL from Supabase Storage or any public host. Recommended: square, at least 128×128px.'
        >
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Input
              placeholder="https://… (e.g. from Supabase Storage)"
              allowClear
            />
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt="Icon preview"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid #303030",
                }}
              />
            ) : null}
          </Space>
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
            <Typography.Text type="secondary" className="text-xs">
              Tip: Upload images to Supabase Storage and paste the public URL
              directly into the icon URL field above, or use the file picker
              here for the banner.
            </Typography.Text>
          </Space>
        </Form.Item>
        <Form.Item name="bannerUrl" hidden>
          <Input />
        </Form.Item>

        {/* ── Submit ── */}
        <Divider className="!mt-8" />
        <Form.Item>
          <Button type="primary" htmlType="submit" {...saveButtonProps}>
            Create community
          </Button>
        </Form.Item>
      </Form>
    </Create>
  );
}
