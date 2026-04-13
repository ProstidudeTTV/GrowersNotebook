"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import {
  Button,
  Descriptions,
  Input,
  Modal,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CatalogSuggestionPayloadEditor } from "@/components/admin/catalog-suggestion-payload-editor";
import { adminAxios } from "@/lib/admin-axios";
import { deepJsonEqual } from "@/lib/json-deep-equal";

type Row = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  approvedPayload?: Record<string, unknown> | null;
  suggestedBy: string;
  suggestedByDisplayName?: string | null;
  status: string;
  createdAt: string;
  moderatedAt?: string | null;
  moderatedBy?: string | null;
  moderatedByDisplayName?: string | null;
  rejectReason?: string | null;
};

const EDIT_KINDS = ["edit_strain", "edit_breeder"];

export default function AdminCatalogSuggestionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  /** Staff-edited payload for new_strain / new_breeder */
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  /** Raw JSON for edit_strain / edit_breeder */
  const [editJson, setEditJson] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAxios.get<Row>(`/catalog-suggestions/${id}`);
      setRow(res.data);
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number } };
      if (ax.response?.status === 404) {
        setError("Suggestion not found.");
      } else {
        setError("Could not load this suggestion.");
      }
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!row) return;
    if (EDIT_KINDS.includes(row.kind)) {
      setEditJson(JSON.stringify(row.payload, null, 2));
    } else {
      const p = { ...row.payload } as Record<string, unknown>;
      if (
        p.reportedEffectPcts &&
        typeof p.reportedEffectPcts === "object" &&
        p.reportedEffectPctsJson == null
      ) {
        p.reportedEffectPctsJson = JSON.stringify(p.reportedEffectPcts);
      }
      setDraft(p);
    }
  }, [row]);

  function buildApprovePayload(): Record<string, unknown> {
    if (!row) throw new Error("No row");
    if (EDIT_KINDS.includes(row.kind)) {
      const parsed = JSON.parse(editJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid JSON payload");
      }
      return parsed as Record<string, unknown>;
    }
    return { ...draft };
  }

  async function approve() {
    if (!row || row.status !== "pending") return;
    setBusy(true);
    setError(null);
    try {
      const payload = buildApprovePayload();
      await adminAxios.patch(`/catalog-suggestions/${row.id}`, {
        action: "approve",
        payload,
      });
      router.push("/admin/catalog-suggestions");
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        ax.response?.data?.message ||
        ax.message ||
        "Approve failed — check payload or duplicates.";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!row || row.status !== "pending") return;
    setBusy(true);
    try {
      await adminAxios.patch(`/catalog-suggestions/${row.id}`, {
        action: "reject",
        rejectReason: rejectReason.trim() || undefined,
      });
      setRejectOpen(false);
      router.push("/admin/catalog-suggestions");
    } catch {
      setError("Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Typography.Text type="secondary">Loading…</Typography.Text>
      </div>
    );
  }

  if (error && !row) {
    return (
      <div className="space-y-4 p-6">
        <Typography.Text type="danger">{error}</Typography.Text>
        <div>
          <Link href="/admin/catalog-suggestions">← Back to inbox</Link>
        </div>
      </div>
    );
  }

  if (!row) return null;

  const pending = row.status === "pending";
  const showStructured = row.kind === "new_strain" || row.kind === "new_breeder";

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/catalog-suggestions">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Inbox
          </Button>
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Review catalog suggestion
        </Typography.Title>
      </div>

      {error ? (
        <Typography.Paragraph type="danger">{error}</Typography.Paragraph>
      ) : null}

      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Status">
          <Tag
            color={
              row.status === "pending"
                ? "gold"
                : row.status === "approved"
                  ? "green"
                  : "red"
            }
          >
            {row.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Kind">{row.kind}</Descriptions.Item>
        <Descriptions.Item label="Submitted">
          {new Date(row.createdAt).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Suggested by">
          <span>
            {row.suggestedByDisplayName?.trim() ? (
              <span className="font-medium">{row.suggestedByDisplayName}</span>
            ) : (
              <Typography.Text type="secondary">(no display name)</Typography.Text>
            )}
            <Typography.Text
              type="secondary"
              className="ml-2 text-xs"
              copyable={{ text: row.suggestedBy }}
            >
              {row.suggestedBy.slice(0, 8)}…
            </Typography.Text>
          </span>
        </Descriptions.Item>
        {row.moderatedAt ? (
          <Descriptions.Item label="Moderated at">
            {new Date(row.moderatedAt).toLocaleString()}
          </Descriptions.Item>
        ) : null}
        {row.moderatedBy ? (
          <Descriptions.Item label="Moderated by">
            <span>
              {row.moderatedByDisplayName?.trim() ? (
                <span className="font-medium">{row.moderatedByDisplayName}</span>
              ) : (
                <Typography.Text type="secondary">(no display name)</Typography.Text>
              )}
              <Typography.Text
                type="secondary"
                className="ml-2 text-xs"
                copyable={{ text: row.moderatedBy }}
              >
                {row.moderatedBy.slice(0, 8)}…
              </Typography.Text>
            </span>
          </Descriptions.Item>
        ) : null}
        {row.rejectReason ? (
          <Descriptions.Item label="Reject reason">
            {row.rejectReason}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      {pending ? (
        <>
          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            {showStructured
              ? "Edit proposal (saved only when you approve)"
              : "Edit payload JSON"}
          </Typography.Title>
          {showStructured ? (
            <CatalogSuggestionPayloadEditor
              kind={row.kind}
              draft={draft}
              onChange={setDraft}
            />
          ) : (
            <div className="space-y-2">
              <Typography.Text type="secondary" className="text-xs">
                Keys depend on kind (e.g. <code>target_slug</code> plus fields to
                change for edit suggestions).
              </Typography.Text>
              <Input.TextArea
                rows={20}
                className="font-mono text-xs"
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {row.status === "approved" ? (
            <div className="rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Submitted vs approved
              </Typography.Title>
              {row.approvedPayload != null &&
              !deepJsonEqual(row.payload, row.approvedPayload) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-medium text-[var(--gn-text-muted)]">
                      User submitted
                    </div>
                    <pre className="max-h-[min(40dvh,18rem)] overflow-auto rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3 text-xs leading-relaxed text-[var(--gn-text)]">
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-[var(--gn-text-muted)]">
                      Staff approved as
                    </div>
                    <pre className="max-h-[min(40dvh,18rem)] overflow-auto rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3 text-xs leading-relaxed text-[var(--gn-text)]">
                      {JSON.stringify(row.approvedPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : row.approvedPayload != null &&
                deepJsonEqual(row.payload, row.approvedPayload) ? (
                <Typography.Paragraph type="secondary" className="mb-0">
                  Staff approved this proposal without changing the payload.
                </Typography.Paragraph>
              ) : (
                <Typography.Paragraph type="secondary" className="mb-0">
                  Approved before staff-edit snapshots were stored; only the
                  submitted payload is shown below.
                </Typography.Paragraph>
              )}
            </div>
          ) : null}

          {!(
            row.status === "approved" &&
            row.approvedPayload != null &&
            !deepJsonEqual(row.payload, row.approvedPayload)
          ) ? (
            <div>
              <Typography.Title level={5}>Submitted payload (read-only)</Typography.Title>
              <pre className="max-h-[min(60dvh,28rem)] overflow-auto rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 text-xs leading-relaxed text-[var(--gn-text)]">
                {JSON.stringify(row.payload, null, 2)}
              </pre>
            </div>
          ) : null}
        </>
      )}

      {pending ? (
        <div className="flex flex-wrap gap-3">
          <Button type="primary" loading={busy} onClick={() => void approve()}>
            Approve with edited payload
          </Button>
          <Button danger loading={busy} onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </div>
      ) : (
        <Typography.Text type="secondary">
          This suggestion was already {row.status}. No further action.
        </Typography.Text>
      )}

      <Modal
        title="Reject suggestion"
        open={rejectOpen}
        onOk={() => void reject()}
        onCancel={() => {
          setRejectOpen(false);
          setRejectReason("");
        }}
        confirmLoading={busy}
      >
        <Input.TextArea
          placeholder="Reason (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
}
