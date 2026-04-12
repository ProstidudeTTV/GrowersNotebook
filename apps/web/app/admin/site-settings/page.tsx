"use client";

import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Radio,
  Space,
  Spin,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { BUILTIN_SEO_REFERENCE } from "@/lib/site-config";

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
  seoDefaultTitle: string | null;
  seoDefaultDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
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
        seoDefaultTitle: row.seoDefaultTitle ?? "",
        seoDefaultDescription: row.seoDefaultDescription ?? "",
        seoKeywords: row.seoKeywords ?? "",
        ogImageUrl: row.ogImageUrl ?? "",
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
          seoDefaultTitle:
            String(values.seoDefaultTitle ?? "").trim() || null,
          seoDefaultDescription:
            String(values.seoDefaultDescription ?? "").trim() || null,
          seoKeywords: String(values.seoKeywords ?? "").trim() || null,
          ogImageUrl: String(values.ogImageUrl ?? "").trim() || null,
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
        These controls affect the public site. Only admins can open this page;
        the API also rejects non-admins.
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
        <p className="mb-4 text-[var(--gn-text-muted)] text-sm">
          A short line shown in the public site chrome (header area). Use for
          seasonal notes or links; leave empty to hide it.
        </p>
        <Form.Item name="motdText" label="MOTD text">
          <Input placeholder="Optional header strip…" maxLength={500} />
        </Form.Item>

        <Typography.Title level={5} className="!mt-8">
          Announcement
        </Typography.Title>
        <p className="mb-4 text-[var(--gn-text-muted)] text-sm">
          A highlighted banner on the public site with title and body. Start/end
          times are optional; when disabled or outside the window, it does not
          show.
        </p>
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
        <p className="mb-4 text-[var(--gn-text-muted)] text-sm">
          When enabled, visitors see a maintenance screen instead of the main
          app. Moderators and admins still get the normal site; login and auth
          routes stay available so staff can sign in.
        </p>
        <Form.Item name="maintenanceEnabled" valuePropName="checked">
          <Checkbox>Maintenance mode (public site)</Checkbox>
        </Form.Item>
        <Form.Item name="maintenanceMessage" label="Message">
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>

        <Typography.Title level={5} className="!mt-8">
          SEO & social preview
        </Typography.Title>
        <p className="mb-4 text-[var(--gn-text-muted)] text-sm">
          These fields override the app&apos;s built-in SEO text when saved.
          Leave a field empty and save to use the built-in value again (nothing
          stored in the database for that field). Inner pages usually set their
          own title in code; the home page and any page without a custom title
          use the default below. The signed-out home hero subtitle uses the meta
          description when set. Google search snippets can lag by days—use
          Search Console → URL Inspection → Request indexing after changes.
        </p>

        <Card size="small" className="mb-6 bg-[var(--gn-admin-surface-2,#141414)] border-[var(--gn-border)]">
          <Typography.Text strong className="block mb-2">
            Built-in defaults (from app code)
          </Typography.Text>
          <p className="text-[var(--gn-text-muted)] text-sm mb-3">
            Shown for reference. Use &quot;Fill with built-in&quot; on a field to
            copy text here into the form so you can tweak it, or leave overrides
            empty to keep using these without duplicating them in the database.
          </p>
          <dl className="text-sm space-y-3 m-0">
            <div>
              <dt className="text-[var(--gn-text-muted)] font-medium">
                Home / fallback{" "}
                <code className="text-xs">&lt;title&gt;</code>
              </dt>
              <dd className="mt-1 m-0 whitespace-pre-wrap break-words font-mono text-[13px]">
                {BUILTIN_SEO_REFERENCE.homeTitle}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--gn-text-muted)] font-medium">
                Typical inner page title pattern
              </dt>
              <dd className="mt-1 m-0 whitespace-pre-wrap break-words font-mono text-[13px]">
                {BUILTIN_SEO_REFERENCE.innerTitleExample}
              </dd>
              <dd className="mt-1 m-0 text-[var(--gn-text-muted)] text-xs">
                The part before &quot;·&quot; is set per page; the suffix is
                fixed in code.
              </dd>
            </div>
            <div>
              <dt className="text-[var(--gn-text-muted)] font-medium">
                Meta description (search snippets & previews)
              </dt>
              <dd className="mt-1 m-0 whitespace-pre-wrap break-words font-mono text-[13px]">
                {BUILTIN_SEO_REFERENCE.metaDescription}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--gn-text-muted)] font-medium">
                Meta keywords (comma-separated, from code)
              </dt>
              <dd className="mt-1 m-0 whitespace-pre-wrap break-words font-mono text-[13px]">
                {BUILTIN_SEO_REFERENCE.keywordsCommaSeparated}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--gn-text-muted)] font-medium">
                Open Graph / Twitter image
              </dt>
              <dd className="mt-1 m-0 text-[var(--gn-text-muted)]">
                No default image in code. Set a URL below so shares show a chosen
                image (~1200×630, <code className="text-xs">https://</code>{" "}
                only).
              </dd>
            </div>
          </dl>
          <Button
            type="default"
            size="small"
            className="mt-4"
            onClick={() =>
              form.setFieldsValue({
                seoDefaultTitle: BUILTIN_SEO_REFERENCE.homeTitle,
                seoDefaultDescription: BUILTIN_SEO_REFERENCE.metaDescription,
                seoKeywords: BUILTIN_SEO_REFERENCE.keywordsCommaSeparated,
              })
            }
          >
            Fill title, description & keywords from built-in
          </Button>
        </Card>

        <Form.Item
          name="seoDefaultTitle"
          label="Override: default meta title (home & fallback)"
          rules={[{ max: 200, message: "Max 200 characters" }]}
          extra={
            <span>
              The HTML <code className="text-xs">&lt;title&gt;</code> for the
              home page and for any route that does not set its own title. This
              is the browser tab label and the main clickable headline in Google.
              Leave empty to use the built-in home title above.
              <Space size="middle" className="mt-1 block">
                <Typography.Link
                  className="text-sm"
                  onClick={() =>
                    form.setFieldsValue({
                      seoDefaultTitle: BUILTIN_SEO_REFERENCE.homeTitle,
                    })
                  }
                >
                  Fill with built-in
                </Typography.Link>
                <Typography.Link
                  className="text-sm"
                  onClick={() => form.setFieldsValue({ seoDefaultTitle: "" })}
                >
                  Clear override
                </Typography.Link>
              </Space>
            </span>
          }
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item
          name="seoDefaultDescription"
          label="Override: meta description"
          rules={[{ max: 500, message: "Max 500 characters" }]}
          extra={
            <span>
              Short summary shown under the title in search results and in many
              link previews; also the paragraph under the big headline on the
              signed-out home page. Aim for one or two clear sentences. Leave
              empty to use the built-in description in the card above.
              <Space size="middle" className="mt-1 block">
                <Typography.Link
                  className="text-sm"
                  onClick={() =>
                    form.setFieldsValue({
                      seoDefaultDescription:
                        BUILTIN_SEO_REFERENCE.metaDescription,
                    })
                  }
                >
                  Fill with built-in
                </Typography.Link>
                <Typography.Link
                  className="text-sm"
                  onClick={() =>
                    form.setFieldsValue({ seoDefaultDescription: "" })
                  }
                >
                  Clear override
                </Typography.Link>
              </Space>
            </span>
          }
        >
          <Input.TextArea rows={4} maxLength={500} />
        </Form.Item>
        <Form.Item
          name="seoKeywords"
          label="Override: meta keywords"
          rules={[{ max: 2000, message: "Max 2000 characters" }]}
          extra={
            <span>
              Comma-separated phrases output in the{" "}
              <code className="text-xs">keywords</code> meta tag. Many search
              engines ignore it; it is optional. Leave empty to use the built-in
              keyword list above.
              <Space size="middle" className="mt-1 block">
                <Typography.Link
                  className="text-sm"
                  onClick={() =>
                    form.setFieldsValue({
                      seoKeywords:
                        BUILTIN_SEO_REFERENCE.keywordsCommaSeparated,
                    })
                  }
                >
                  Fill with built-in
                </Typography.Link>
                <Typography.Link
                  className="text-sm"
                  onClick={() => form.setFieldsValue({ seoKeywords: "" })}
                >
                  Clear override
                </Typography.Link>
              </Space>
            </span>
          }
        >
          <Input maxLength={2000} />
        </Form.Item>
        <Form.Item
          name="ogImageUrl"
          label="Open Graph / Twitter share image URL"
          rules={[{ max: 2000, message: "Max 2000 characters" }]}
          extra={
            <span>
              Image used when someone shares a link to the site (Discord, X,
              iMessage, etc.). Must be a full <code className="text-xs">https://</code>{" "}
              URL. Suggested size about 1200×630. There is no built-in image; if
              this is empty, platforms may pick another image from the page or
              show none. Invalid URLs are rejected when saving.
              <Typography.Link
                className="text-sm mt-1 block"
                onClick={() => form.setFieldsValue({ ogImageUrl: "" })}
              >
                Clear URL
              </Typography.Link>
            </span>
          }
        >
          <Input placeholder="https://…" maxLength={2000} />
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
