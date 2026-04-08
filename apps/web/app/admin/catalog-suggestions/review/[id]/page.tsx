"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Descriptions, Input, Modal, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";

type Row = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  suggestedBy: string;
  status: string;
  createdAt: string;
  moderatedAt?: string | null;
  moderatedBy?: string | null;
  rejectReason?: string | null;
};

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

  async function approve() {
    if (!row || row.status !== "pending") return;
    setBusy(true);
    try {
      await adminAxios.patch(`/catalog-suggestions/${row.id}`, {
        action: "approve",
      });
      router.push("/admin/catalog-suggestions");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Approve failed — check payload or duplicates.";
      setError(msg);
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
        <Descriptions.Item label="Suggested by user id">
          <Typography.Text copyable>{row.suggestedBy}</Typography.Text>
        </Descriptions.Item>
        {row.moderatedAt ? (
          <Descriptions.Item label="Moderated at">
            {new Date(row.moderatedAt).toLocaleString()}
          </Descriptions.Item>
        ) : null}
        {row.moderatedBy ? (
          <Descriptions.Item label="Moderated by">
            <Typography.Text copyable>{row.moderatedBy}</Typography.Text>
          </Descriptions.Item>
        ) : null}
        {row.rejectReason ? (
          <Descriptions.Item label="Reject reason">
            {row.rejectReason}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      <div>
        <Typography.Title level={5}>Payload</Typography.Title>
        <pre className="max-h-[min(60dvh,28rem)] overflow-auto rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 text-xs leading-relaxed text-[var(--gn-text)]">
          {JSON.stringify(row.payload, null, 2)}
        </pre>
      </div>

      {pending ? (
        <div className="flex flex-wrap gap-3">
          <Button type="primary" loading={busy} onClick={() => void approve()}>
            Approve
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
