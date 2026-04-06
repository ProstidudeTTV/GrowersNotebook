"use client";

import { Edit, useForm } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Select,
  Switch,
  Typography,
} from "antd";

const { TextArea } = Input;
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { adminAxios } from "@/lib/admin-axios";

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
];

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminProfileEditPage() {
  const params = useParams();
  const id = params.id as string;
  const invalidate = useInvalidate();
  const { message } = AntdApp.useApp();
  const { form, formProps, saveButtonProps, onFinish, query } = useForm({
    resource: "profiles",
    action: "edit",
  });

  const record = query?.data?.data;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      displayName: record.displayName,
      description: (record as { description?: string | null }).description,
      role: record.role,
      moderationBanned: !!(record as { bannedAt?: string | null }).bannedAt,
      suspendedLocal: (record as { suspendedUntil?: string | null })
        .suspendedUntil
        ? toDatetimeLocalValue(
            (record as { suspendedUntil: string }).suspendedUntil,
          )
        : "",
    });
  }, [record, form]);

  const clearAvatar = async () => {
    try {
      await adminAxios.patch(`/profiles/${id}`, { avatarUrl: null });
      message.success("Profile picture cleared");
      await invalidate({
        resource: "profiles",
        invalidates: ["detail", "list"],
      });
      await query?.refetch();
    } catch {
      message.error("Could not clear profile picture");
    }
  };

  return (
    <Edit footerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          const v = values as {
            displayName?: string | null;
            description?: string | null;
            role?: string;
            moderationBanned?: boolean;
            suspendedLocal?: string;
          };
          await onFinish({
            displayName: v.displayName,
            description: v.description?.trim() ? v.description.trim() : null,
            role: v.role,
            bannedAt: v.moderationBanned
              ? new Date().toISOString()
              : null,
            suspendedUntil:
              v.suspendedLocal && String(v.suspendedLocal).trim()
                ? new Date(String(v.suspendedLocal)).toISOString()
                : null,
          } as never);
        }}
      >
        <Typography.Paragraph type="secondary">
          User ID: <code>{id}</code>
        </Typography.Paragraph>

        <Form.Item label="Display name" name="displayName">
          <Input placeholder="Shown on posts and comments" allowClear />
        </Form.Item>
        <Form.Item
          label="Profile description"
          name="description"
          extra="Public bio on /u/… (max 2000 characters)."
        >
          <TextArea rows={3} maxLength={2000} showCount allowClear />
        </Form.Item>
        <Form.Item label="Role" name="role" rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} />
        </Form.Item>

        <Typography.Title level={5}>Profile picture</Typography.Title>
        <Button onClick={() => void clearAvatar()} className="mb-4">
          Reset profile picture
        </Button>

        <Typography.Title level={5}>Moderation</Typography.Title>
        <Form.Item
          label="Banned"
          name="moderationBanned"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Typography.Paragraph type="secondary" className="-mt-2 mb-4">
          Banned users cannot use the API. Turn off to lift a ban (clears ban
          timestamp on save).
        </Typography.Paragraph>

        <Form.Item
          label="Suspended until"
          name="suspendedLocal"
          extra="Leave empty to clear suspension. User cannot use the API until this time (local)."
        >
          <Input type="datetime-local" />
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
