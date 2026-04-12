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
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminAxios } from "@/lib/admin-axios";

type ModerationSummary = {
  profile: {
    bannedAt: string | null;
    banExpiresAt: string | null;
    suspendedUntil: string | null;
  };
  warnings: Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  }>;
  recentAudit: Array<{
    id: string;
    createdAt: string;
    action: string;
    actorProfileId: string | null;
    entityType: string | null;
    entityId: string | null;
    subjectProfileId: string | null;
    metadata: Record<string, unknown>;
  }>;
};

function ModerationStaffPanel({ profileId }: { profileId: string }) {
  const [data, setData] = useState<ModerationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAxios.get<ModerationSummary>(
          `/profiles/${encodeURIComponent(profileId)}/moderation-summary`,
        );
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not load moderation summary.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (error) {
    return <Typography.Paragraph type="danger">{error}</Typography.Paragraph>;
  }
  if (!data) {
    return <Typography.Paragraph type="secondary">Loading…</Typography.Paragraph>;
  }

  return (
    <div className="mt-10 space-y-8 border-t border-neutral-700 pt-8">
      <Typography.Title level={5}>Staff: account state</Typography.Title>
      <ul className="list-none space-y-1 text-sm text-neutral-300">
        <li>
          Banned at:{" "}
          {data.profile.bannedAt
            ? new Date(data.profile.bannedAt).toLocaleString()
            : "—"}
        </li>
        <li>
          Ban expires:{" "}
          {data.profile.banExpiresAt
            ? new Date(data.profile.banExpiresAt).toLocaleString()
            : "— (permanent if banned)"}
        </li>
        <li>
          Suspended until:{" "}
          {data.profile.suspendedUntil
            ? new Date(data.profile.suspendedUntil).toLocaleString()
            : "—"}
        </li>
      </ul>

      <Typography.Title level={5}>Warnings & report notices</Typography.Title>
      {data.warnings.length === 0 ? (
        <Typography.Paragraph type="secondary">
          No moderation warnings or report updates on file.
        </Typography.Paragraph>
      ) : (
        <ul className="space-y-3">
          {data.warnings.map((w) => (
            <li
              key={w.id}
              className="rounded-md border border-neutral-700 bg-neutral-900/40 p-3 text-sm"
            >
              <p className="font-medium text-neutral-100">{w.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {w.kind} · {new Date(w.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-neutral-300">
                {w.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Typography.Title level={5}>Recent audit (this profile)</Typography.Title>
      {data.recentAudit.length === 0 ? (
        <Typography.Paragraph type="secondary">
          No audit rows yet.
        </Typography.Paragraph>
      ) : (
        <ul className="space-y-2 text-sm text-neutral-300">
          {data.recentAudit.map((a) => (
            <li key={a.id}>
              <span className="text-neutral-500">
                {new Date(a.createdAt).toLocaleString()}
              </span>{" "}
              — <code className="text-xs">{a.action}</code>
              {a.entityType ? (
                <span className="text-neutral-500">
                  {" "}
                  ({a.entityType}
                  {a.entityId ? ` ${a.entityId.slice(0, 8)}…` : ""})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
      banExpiresLocal: (record as { banExpiresAt?: string | null })
        .banExpiresAt
        ? toDatetimeLocalValue(
            (record as { banExpiresAt: string }).banExpiresAt,
          )
        : "",
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
            banExpiresLocal?: string;
            suspendedLocal?: string;
          };
          const banExpiresAt =
            !v.moderationBanned
              ? null
              : v.banExpiresLocal && String(v.banExpiresLocal).trim()
                ? new Date(String(v.banExpiresLocal)).toISOString()
                : null;
          await onFinish({
            displayName: v.displayName,
            description: v.description?.trim() ? v.description.trim() : null,
            role: v.role,
            bannedAt: v.moderationBanned
              ? new Date().toISOString()
              : null,
            banExpiresAt,
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
          Banned users cannot use the API. Turn off to lift a ban. Optional ban
          end time = temporary ban; leave empty while banned for a permanent ban.
          Suspension is separate and time-limited via the field below.
        </Typography.Paragraph>

        <Form.Item
          noStyle
          shouldUpdate={(prev, cur) =>
            prev.moderationBanned !== cur.moderationBanned
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("moderationBanned") ? (
              <Form.Item
                label="Ban expires (local)"
                name="banExpiresLocal"
                extra="Empty = permanent ban. Set a date/time to auto-lift the ban after that moment."
              >
                <Input type="datetime-local" />
              </Form.Item>
            ) : null
          }
        </Form.Item>

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
      <ModerationStaffPanel profileId={id} />
    </Edit>
  );
}
