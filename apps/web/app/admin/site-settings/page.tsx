"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  message,
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
  maintenanceEmailSubject: string | null;
  maintenanceEmailBody: string | null;
  seoDefaultTitle: string | null;
  seoDefaultDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  updatedAt: string;
  maintenanceEmailConfigured: boolean;
  emailOutreachFailureAt: string | null;
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
  const [sendingBulk, setSendingBulk] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedSite, setLoadedSite] = useState<{
    maintenanceEnabled: boolean;
    maintenanceEmailConfigured: boolean;
    emailOutreachFailureAt: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setLoadError("Could not load sign-in client.");
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
      setLoadedSite({
        maintenanceEnabled: row.maintenanceEnabled,
        maintenanceEmailConfigured: row.maintenanceEmailConfigured ?? false,
        emailOutreachFailureAt: row.emailOutreachFailureAt ?? null,
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
        maintenanceEmailSubject: row.maintenanceEmailSubject ?? "",
        maintenanceEmailBody: row.maintenanceEmailBody ?? "",
        notifyUsersOnMaintenance: true,
        clearEmailOutreachFailure: false,
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

    const starts = datetimeLocalToIso(
      String(values.announcementStartsAt ?? ""),
    );
    const ends = datetimeLocalToIso(String(values.announcementEndsAt ?? ""));

    if (values.announcementEnabled) {
      const t = String(values.announcementTitle ?? "").trim();
      const b = String(values.announcementBody ?? "").trim();
      if (!t && !b) {
        void message.error(
          "Add an announcement title or body, or turn off the announcement.",
        );
        return;
      }
    }

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
          announcementStyle: values.announcementStyle ?? "info",
          announcementStartsAt: starts,
          announcementEndsAt: ends,
          announcementEnabled: Boolean(values.announcementEnabled),
          maintenanceEnabled: Boolean(values.maintenanceEnabled),
          notifyUsersOnMaintenance: Boolean(values.notifyUsersOnMaintenance),
          maintenanceMessage:
            String(values.maintenanceMessage ?? "").trim() || null,
          maintenanceEmailSubject:
            String(values.maintenanceEmailSubject ?? "").trim() || null,
          maintenanceEmailBody:
            String(values.maintenanceEmailBody ?? "").trim() || null,
          seoDefaultTitle:
            String(values.seoDefaultTitle ?? "").trim() || null,
          seoDefaultDescription:
            String(values.seoDefaultDescription ?? "").trim() || null,
          seoKeywords: String(values.seoKeywords ?? "").trim() || null,
          ogImageUrl: String(values.ogImageUrl ?? "").trim() || null,
          clearEmailOutreachFailure: Boolean(values.clearEmailOutreachFailure),
        }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const sendBulkMaintenanceEmail = () => {
    if (!loadedSite?.maintenanceEmailConfigured) return;
    Modal.confirm({
      title: "Send maintenance email to all registered users?",
      content:
        "This sends one plain-text email per Supabase auth account using the subject and body fields below (including text not yet saved).",
      okText: "Send",
      cancelText: "Cancel",
      onOk: async () => {
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
        const v = form.getFieldsValue() as Record<string, unknown>;
        setSendingBulk(true);
        try {
          await apiFetch<{ ok: boolean }>(
            "/admin/site-config/send-maintenance-email",
            {
              method: "POST",
              token: session.access_token,
              timeoutMs: 600_000,
              body: JSON.stringify({
                emailSubject:
                  String(v.maintenanceEmailSubject ?? "").trim() || null,
                emailBody:
                  String(v.maintenanceEmailBody ?? "").trim() || null,
                maintenanceMessage:
                  String(v.maintenanceMessage ?? "").trim() || null,
              }),
            },
          );
          void message.success(
            "Bulk maintenance email finished (check API logs if needed).",
          );
        } catch (e) {
          void message.error(
            e instanceof Error ? e.message : "Bulk email failed.",
          );
        } finally {
          setSendingBulk(false);
        }
      },
    });
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
        <Typography.Title level={3}>Site Settings</Typography.Title>
        <p className="mt-2 text-red-400">{loadError}</p>
        <Button type="primary" className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0">
          Site Settings
        </Typography.Title>
        <Typography.Text type="secondary" className="text-sm">
          Admin-only &mdash; changes take effect immediately on the public site.
        </Typography.Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => void onFinish(v)}
        initialValues={{
          announcementStyle: "info",
          announcementEnabled: false,
          maintenanceEnabled: false,
          notifyUsersOnMaintenance: true,
          clearEmailOutreachFailure: false,
        }}
      >
        {/* ── Message of the day ── */}
        <Card
          className="mb-4"
          title={
            <span className="flex items-center gap-2">
              <span>📢</span> Message of the Day
            </span>
          }
        >
          <p className="mb-4 text-sm text-[var(--gn-text-muted)]">
            A short strip shown just below the site header on the public app.
            Use for seasonal notes or links; leave empty to hide it.
          </p>
          <Form.Item name="motdText" label="MOTD text" className="!mb-0">
            <Input placeholder="Optional header strip…" maxLength={500} />
          </Form.Item>
        </Card>

        {/* ── Announcement ── */}
        <Card
          className="mb-4"
          title={
            <span className="flex items-center gap-2">
              <span>📣</span> Announcement Banner
            </span>
          }
        >
          <p className="mb-4 text-sm text-[var(--gn-text-muted)]">
            A highlighted banner below the MOTD with title and body. Start/end
            use your browser&apos;s local timezone. Leave both times empty to
            show whenever enabled. At least a title or body is required when
            enabled.
          </p>
          <Form.Item name="announcementEnabled" valuePropName="checked">
            <Checkbox>Enable announcement (respects start/end window)</Checkbox>
          </Form.Item>
          <Form.Item name="announcementStyle" label="Style">
            <Radio.Group>
              <Radio value="info">Info (blue)</Radio>
              <Radio value="warning">Warning (yellow)</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="announcementTitle" label="Title">
            <Input maxLength={200} placeholder="Announcement headline" />
          </Form.Item>
          <Form.Item name="announcementBody" label="Body">
            <Input.TextArea
              rows={4}
              maxLength={4000}
              placeholder="Full announcement text…"
            />
          </Form.Item>
          <Divider dashed className="!my-3" />
          <Form.Item name="announcementStartsAt" label="Starts at (local time)">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item
            name="announcementEndsAt"
            label="Ends at (local time)"
            className="!mb-0"
          >
            <Input type="datetime-local" />
          </Form.Item>
        </Card>

        {/* ── Maintenance ── */}
        <Card
          className="mb-4"
          title={
            <span className="flex items-center gap-2">
              <span>🔧</span> Maintenance Mode
            </span>
          }
        >
          <p className="mb-4 text-sm text-[var(--gn-text-muted)]">
            When enabled, visitors see a maintenance screen instead of the app.
            Moderators and admins still see the normal site; login routes stay
            available so staff can sign in.
          </p>
          {loadedSite?.emailOutreachFailureAt ? (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              message="Bulk email reported failures"
              description={`Last flagged: ${new Date(loadedSite.emailOutreachFailureAt).toLocaleString()}. Signed-in users may see a bottom-right prompt to join the mailing list until you clear the flag below (e.g. after fixing SMTP).`}
            />
          ) : null}
          <Form.Item name="maintenanceEnabled" valuePropName="checked">
            <Checkbox>Enable maintenance mode (public site)</Checkbox>
          </Form.Item>
          <Form.Item
            name="notifyUsersOnMaintenance"
            valuePropName="checked"
            extra="When you save with maintenance turning on (was off, now on), sends one email per registered user using the subject and body below (or their defaults)."
          >
            <Checkbox>
              Email all registered users when enabling maintenance
            </Checkbox>
          </Form.Item>
          <Form.Item
            name="maintenanceMessage"
            label="Public maintenance page message"
            extra="Shown on the maintenance screen for visitors. Also used in the default email template when the bulk email body below is left empty."
          >
            <Input.TextArea
              rows={3}
              maxLength={2000}
              placeholder="We're doing some upgrades — back shortly!"
            />
          </Form.Item>
          <Divider dashed className="!my-3" />
          <Typography.Text strong className="!mb-1 block">
            Bulk email (maintenance notice)
          </Typography.Text>
          <p className="mb-4 mt-1 text-sm text-[var(--gn-text-muted)]">
            Optional subject and full message body for the maintenance email
            blast. Leave the body empty to use the default notice plus the
            message above. Use &ldquo;Send email now&rdquo; to send without
            turning maintenance on.
          </p>
          <Form.Item
            name="maintenanceEmailSubject"
            label="Email subject"
            extra="Leave empty to use the default subject."
          >
            <Input
              maxLength={300}
              placeholder="Growers Notebook — maintenance notice"
            />
          </Form.Item>
          <Form.Item name="maintenanceEmailBody" label="Email body">
            <Input.TextArea rows={6} maxLength={8000} />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button
                type="default"
                disabled={!loadedSite?.maintenanceEmailConfigured}
                loading={sendingBulk}
                onClick={() => sendBulkMaintenanceEmail()}
              >
                Send email to all users now
              </Button>
              {!loadedSite?.maintenanceEmailConfigured ? (
                <Typography.Text type="secondary" className="text-sm">
                  Bulk email needs SMTP and auth admin credentials on the API.
                </Typography.Text>
              ) : null}
            </Space>
          </Form.Item>
          <Form.Item
            name="clearEmailOutreachFailure"
            valuePropName="checked"
            extra="Clears the public mailing-list recovery prompt for everyone after SMTP is working again."
            className="!mb-0"
          >
            <Checkbox>Clear mailing-list nudge flag</Checkbox>
          </Form.Item>
        </Card>

        {/* ── SEO ── */}
        <Card
          className="mb-6"
          title={
            <span className="flex items-center gap-2">
              <span>🔍</span> SEO &amp; Social Preview
            </span>
          }
        >
          <p className="mb-4 text-sm text-[var(--gn-text-muted)]">
            These fields override the app&apos;s built-in SEO text. Leave a
            field empty and save to revert to the built-in value. Google search
            snippets can lag by days &mdash; use Search Console &rarr; URL
            Inspection &rarr; Request indexing after changes.
          </p>

          <Card
            size="small"
            className="mb-6 border-[var(--gn-border)] bg-[var(--gn-admin-surface-2,#141414)]"
          >
            <Typography.Text strong className="mb-2 block">
              Built-in defaults (from app code &mdash; for reference)
            </Typography.Text>
            <p className="mb-3 text-sm text-[var(--gn-text-muted)]">
              Use &ldquo;Fill with built-in&rdquo; to copy these into the form
              so you can tweak them, or leave overrides empty to use these
              automatically.
            </p>
            <dl className="m-0 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-[var(--gn-text-muted)]">
                  Home / fallback{" "}
                  <code className="text-xs">&lt;title&gt;</code>
                </dt>
                <dd className="m-0 mt-1 whitespace-pre-wrap break-words font-mono text-[13px]">
                  {BUILTIN_SEO_REFERENCE.homeTitle}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--gn-text-muted)]">
                  Typical inner page title pattern
                </dt>
                <dd className="m-0 mt-1 whitespace-pre-wrap break-words font-mono text-[13px]">
                  {BUILTIN_SEO_REFERENCE.innerTitleExample}
                </dd>
                <dd className="m-0 mt-1 text-xs text-[var(--gn-text-muted)]">
                  The part before &ldquo;&middot;&rdquo; is set per page; the
                  suffix is fixed in code.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--gn-text-muted)]">
                  Meta description (search snippets &amp; previews)
                </dt>
                <dd className="m-0 mt-1 whitespace-pre-wrap break-words font-mono text-[13px]">
                  {BUILTIN_SEO_REFERENCE.metaDescription}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--gn-text-muted)]">
                  Meta keywords (comma-separated, from code)
                </dt>
                <dd className="m-0 mt-1 whitespace-pre-wrap break-words font-mono text-[13px]">
                  {BUILTIN_SEO_REFERENCE.keywordsCommaSeparated}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--gn-text-muted)]">
                  Open Graph / Twitter image
                </dt>
                <dd className="m-0 mt-1 text-[var(--gn-text-muted)]">
                  No default in code. Set a URL below so shares show a chosen
                  image (~1200&times;630,{" "}
                  <code className="text-xs">https://</code> only).
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
              Fill title, description &amp; keywords from built-in
            </Button>
          </Card>

          <Form.Item
            name="seoDefaultTitle"
            label="Override: default meta title (home & fallback)"
            rules={[{ max: 200, message: "Max 200 characters" }]}
            extra={
              <span>
                The HTML <code className="text-xs">&lt;title&gt;</code> for the
                home page and any route without its own title (browser tab label
                + Google headline). Leave empty to use the built-in.
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
                    onClick={() =>
                      form.setFieldsValue({ seoDefaultTitle: "" })
                    }
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
                Short summary for search result snippets and link previews; also
                the subtitle on the signed-out home page. One or two clear
                sentences. Leave empty to use the built-in.
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
                Comma-separated phrases in the{" "}
                <code className="text-xs">keywords</code> meta tag. Most search
                engines ignore it; optional. Leave empty to use the built-in.
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
                Image shown when someone shares a link (Discord, X, iMessage,
                etc.). Must be a full{" "}
                <code className="text-xs">https://</code> URL, ~1200&times;630px.
                If empty, platforms may pick another image or show none.
                <Typography.Link
                  className="mt-1 block text-sm"
                  onClick={() => form.setFieldsValue({ ogImageUrl: "" })}
                >
                  Clear URL
                </Typography.Link>
              </span>
            }
            className="!mb-0"
          >
            <Input placeholder="https://…" maxLength={2000} />
          </Form.Item>
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            size="large"
          >
            Save all settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
