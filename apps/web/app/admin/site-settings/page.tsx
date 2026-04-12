"use client";

import {
  Button,
  Checkbox,
  Form,
  Input,
  Radio,
  Spin,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";

type StaffSiteConfig = {
  motdText: string | null;
  announcementTitle: string | null;
  announcementBody: string | null;
  announcementStyle: string;
  announcementStartsAt: string | null;
  announcementEndsAt: string | null;
  announcementEnabled: boolean;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
};

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string | null {
  const t = value?.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminSiteSettingsPage() {
  const [form] = Form.useForm<Record<string, unknown>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setLoadError("Could not load Supabase client.");
      setLoading(false);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setLoadError("Not signed in.");
      setLoading(false);
      return;
    }
    try {
      const row = await apiFetch<StaffSiteConfig>("/admin/site-config", {
        token: session.access_token,
        timeoutMs: 20_000,
      });
      form.setFieldsValue({
        motdText: row.motdText ?? "",
        announcementTitle: row.announcementTitle ?? "",
        announcementBody: row.announcementBody ?? "",
        announcementStyle:
          row.announcementStyle === "warning" ? "warning" : "info",
        announcementStartsAt: isoToDatetimeLocal(row.announcementStartsAt),
        announcementEndsAt: isoToDatetimeLocal(row.announcementEndsAt),
        announcementEnabled: row.announcementEnabled,
        maintenanceEnabled: row.maintenanceEnabled,
        maintenanceMessage: row.maintenanceMessage ?? "",
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFinish = async (values: Record<string, unknown>) => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const starts = datetimeLocalToIso(String(values.announcementStartsAt ?? ""));
    const ends = datetimeLocalToIso(String(values.announcementEndsAt ?? ""));

    setSaving(true);
    try {
      await apiFetch<StaffSiteConfig>("/admin/site-config", {
        method: "PATCH",
        token: session.access_token,
        body: JSON.stringify({
          motdText: String(values.motdText ?? "").trim() || null,
          announcementTitle:
            String(values.announcementTitle ?? "").trim() || null,
          announcementBody:
            String(values.announcementBody ?? "").trim() || null,
          announcementStyle: values.announcementStyle,
          announcementStartsAt: starts,
          announcementEndsAt: ends,
          announcementEnabled: Boolean(values.announcementEnabled),
          maintenanceEnabled: Boolean(values.maintenanceEnabled),
          maintenanceMessage:
            String(values.maintenanceMessage ?? "").trim() || null,
        }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <Typography.Title level={3}>Site settings</Typography.Title>
        <p className="mt-2 text-red-400">{loadError}</p>
        <Button type="primary" className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Typography.Title level={3}>Site banners & maintenance</Typography.Title>
      <p className="mt-1 text-[var(--gn-text-muted)]">
        MOTD and announcements appear on the public site. Maintenance hides the
        site for everyone except moderators and admins (login and auth pages
        stay available).
      </p>

      <Form
        form={form}
        layout="vertical"
        className="mt-8"
        onFinish={(v) => void onFinish(v)}
        initialValues={{
          announcementStyle: "info",
          announcementEnabled: false,
          maintenanceEnabled: false,
        }}
      >
        <Typography.Title level={5}>Message of the day</Typography.Title>
        <Form.Item name="motdText" label="MOTD (short line)">
          <Input placeholder="Optional header strip…" maxLength={500} />
        </Form.Item>

        <Typography.Title level={5} className="!mt-8">
          Announcement
        </Typography.Title>
        <Form.Item name="announcementEnabled" valuePropName="checked">
          <Checkbox>Enable announcement (respects start/end window)</Checkbox>
        </Form.Item>
        <Form.Item name="announcementStyle" label="Style">
          <Radio.Group>
            <Radio value="info">Info</Radio>
            <Radio value="warning">Warning</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="announcementTitle" label="Title">
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="announcementBody" label="Body">
          <Input.TextArea rows={4} maxLength={4000} />
        </Form.Item>
        <Form.Item name="announcementStartsAt" label="Starts at (local)">
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="announcementEndsAt" label="Ends at (local)">
          <Input type="datetime-local" />
        </Form.Item>

        <Typography.Title level={5} className="!mt-8">
          Maintenance
        </Typography.Title>
        <Form.Item name="maintenanceEnabled" valuePropName="checked">
          <Checkbox>Maintenance mode (public site)</Checkbox>
        </Form.Item>
        <Form.Item name="maintenanceMessage" label="Message">
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>

        <Form.Item className="!mt-8">
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
