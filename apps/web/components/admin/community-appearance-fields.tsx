"use client";

import {
  Button,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import type { FormInstance } from "antd";
import {
  COMMUNITY_ICON_KEYS,
  COMMUNITY_ICON_LABELS,
} from "@/lib/community-icon-keys";
import { uploadCommunityImageAdmin } from "@/lib/upload-community-image-admin";
import { useRef, useState } from "react";

type Props = {
  form: FormInstance;
  /** Required for uploads; on create, set after slug is entered. */
  communitySlug: string | undefined;
  showSlugField?: boolean;
  slugDisabled?: boolean;
};

export function CommunityAppearanceFields({
  form,
  communitySlug,
  showSlugField = false,
  slugDisabled = false,
}: Props) {
  const bannerUrl = Form.useWatch<string | null | undefined>("bannerUrl", form);
  const iconUrl = Form.useWatch<string | null | undefined>("iconUrl", form);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);

  const requireSlug = () => {
    const slug = communitySlug?.trim();
    if (!slug) {
      void message.error("Enter a slug before uploading images.");
      return null;
    }
    return slug;
  };

  const handleBanner = async (file: File | null) => {
    if (!file) return;
    const slug = requireSlug();
    if (!slug) return;
    setBannerUploading(true);
    try {
      const url = await uploadCommunityImageAdmin(file, slug, "banner");
      form.setFieldValue("bannerUrl", url);
      void message.success("Banner uploaded.");
    } catch (e) {
      void message.error(
        e instanceof Error ? e.message : "Could not upload banner.",
      );
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleIcon = async (file: File | null) => {
    if (!file) return;
    const slug = requireSlug();
    if (!slug) return;
    setIconUploading(true);
    try {
      const url = await uploadCommunityImageAdmin(file, slug, "icon");
      form.setFieldValue("iconUrl", url);
      void message.success("Community icon uploaded.");
    } catch (e) {
      void message.error(
        e instanceof Error ? e.message : "Could not upload icon.",
      );
    } finally {
      setIconUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  return (
    <>
      <Divider orientation="left" orientationMargin={0}>
        <Typography.Text
          type="secondary"
          className="text-xs font-bold uppercase tracking-widest"
        >
          Identity &amp; copy
        </Typography.Text>
      </Divider>

      {showSlugField ? (
        <Form.Item
          label="Slug"
          name="slug"
          rules={[
            { required: true, min: 2 },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: "Lowercase letters, numbers, and hyphens only",
            },
          ]}
          extra="Used in URLs: /community/your-slug"
        >
          <Input disabled={slugDisabled} placeholder="e.g. autoflowers" />
        </Form.Item>
      ) : null}

      <Form.Item
        label="Display name"
        name="name"
        rules={[{ required: true, min: 2, max: 120 }]}
      >
        <Input placeholder="Community name shown on the site" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea
          rows={5}
          maxLength={2000}
          showCount
          placeholder="What is this community about?"
        />
      </Form.Item>

      <Divider orientation="left" orientationMargin={0} className="!mt-8">
        <Typography.Text
          type="secondary"
          className="text-xs font-bold uppercase tracking-widest"
        >
          Images (upload)
        </Typography.Text>
      </Divider>

      <Typography.Paragraph type="secondary" className="!mb-4 text-sm">
        Upload a square icon and a wide banner. They appear on the community
        page, directory cards, and sidebar. JPEG / PNG / WebP / GIF, max 5 MB
        each.
      </Typography.Paragraph>

      <Form.Item
        label="Community icon"
        extra="Square image, at least 128×128px. Shown on cards and the community header."
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt="Icon preview"
              style={{
                width: 80,
                height: 80,
                objectFit: "cover",
                borderRadius: 12,
                border: "2px solid #303030",
              }}
            />
          ) : (
            <Typography.Text type="secondary">No icon yet.</Typography.Text>
          )}
          <Space wrap>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              disabled={iconUploading}
              onChange={(e) => {
                void handleIcon(e.target.files?.[0] ?? null);
              }}
            />
            {iconUrl ? (
              <Button
                size="small"
                disabled={iconUploading}
                onClick={() => form.setFieldValue("iconUrl", null)}
              >
                Remove icon
              </Button>
            ) : null}
            {iconUploading ? (
              <Typography.Text type="secondary">Uploading…</Typography.Text>
            ) : null}
          </Space>
        </Space>
      </Form.Item>
      <Form.Item name="iconUrl" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        label="Banner image"
        extra="Wide hero on the community page and directory card strip when set."
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt="Banner preview"
              style={{
                display: "block",
                width: "100%",
                maxWidth: 720,
                maxHeight: 200,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          ) : (
            <Typography.Text type="secondary">No banner yet.</Typography.Text>
          )}
          <Space wrap>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              disabled={bannerUploading}
              onChange={(e) => {
                void handleBanner(e.target.files?.[0] ?? null);
              }}
            />
            {bannerUrl ? (
              <Button
                size="small"
                disabled={bannerUploading}
                onClick={() => form.setFieldValue("bannerUrl", null)}
              >
                Remove banner
              </Button>
            ) : null}
            {bannerUploading ? (
              <Typography.Text type="secondary">Uploading…</Typography.Text>
            ) : null}
          </Space>
        </Space>
      </Form.Item>
      <Form.Item name="bannerUrl" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        label="Fallback icon style"
        name="iconKey"
        extra="Used when no custom icon image is uploaded."
      >
        <Select
          allowClear
          placeholder="Default (colored initial)"
          options={COMMUNITY_ICON_KEYS.map((k) => ({
            value: k,
            label: COMMUNITY_ICON_LABELS[k],
          }))}
        />
      </Form.Item>
    </>
  );
}
