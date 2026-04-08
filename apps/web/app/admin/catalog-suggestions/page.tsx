"use client";

import { List } from "@refinedev/antd";
import { App, Button, Input, Modal, Table, Typography } from "antd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";

type Row = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  suggestedBy: string;
  status: string;
  createdAt: string;
};

export default function AdminCatalogSuggestionsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const res = await adminAxios.get<Row[]>("/catalog-suggestions", {
        params: { _start: start, _end: end, status: "pending" },
      });
      setRows(res.data);
      const n = res.headers["x-total-count"];
      setTotal(n ? Number(n) : res.data.length);
    } catch {
      message.error("Could not load suggestions");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, message]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    try {
      await adminAxios.patch(`/catalog-suggestions/${id}`, {
        action: "approve",
      });
      message.success("Approved");
      void load();
    } catch {
      message.error("Approve failed");
    }
  }

  async function reject() {
    if (!rejectId) return;
    try {
      await adminAxios.patch(`/catalog-suggestions/${rejectId}`, {
        action: "reject",
        rejectReason: rejectReason.trim() || undefined,
      });
      message.success("Rejected");
      setRejectId(null);
      setRejectReason("");
      void load();
    } catch {
      message.error("Reject failed");
    }
  }

  return (
    <List title="Catalog suggestions inbox">
      <Typography.Paragraph type="secondary">
        Approve applies creates or patches catalog rows from the payload. This
        inbox is separate from review moderation.
      </Typography.Paragraph>
      <Table<Row>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        columns={[
          {
            title: "Created",
            render: (_: unknown, r) =>
              new Date(r.createdAt).toLocaleString(),
          },
          {
            title: "Kind",
            dataIndex: "kind",
            render: (kind: string, r: Row) => (
              <Link
                href={`/admin/catalog-suggestions/review/${r.id}`}
                className="font-medium text-[#1677ff] hover:underline"
              >
                {kind}
              </Link>
            ),
          },
          { title: "Submitted by", dataIndex: "suggestedBy", ellipsis: true },
          {
            title: "Payload",
            render: (_: unknown, r) => (
              <Link
                href={`/admin/catalog-suggestions/review/${r.id}`}
                className="block max-w-[360px] text-[var(--gn-text)] no-underline hover:text-[#1677ff]"
              >
                <Typography.Paragraph
                  ellipsis={{ rows: 3 }}
                  style={{ margin: 0 }}
                >
                  {JSON.stringify(r.payload)}
                </Typography.Paragraph>
              </Link>
            ),
          },
          {
            title: "Actions",
            render: (_: unknown, r) => (
              <span className="flex flex-wrap gap-2">
                <Link href={`/admin/catalog-suggestions/review/${r.id}`}>
                  <Button size="small">Review</Button>
                </Link>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => void approve(r.id)}
                >
                  Approve
                </Button>
                <Button size="small" danger onClick={() => setRejectId(r.id)}>
                  Reject
                </Button>
              </span>
            ),
          },
        ]}
      />
      <Modal
        title="Reject suggestion"
        open={rejectId !== null}
        onOk={() => void reject()}
        onCancel={() => {
          setRejectId(null);
          setRejectReason("");
        }}
      >
        <Input.TextArea
          placeholder="Reason (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </List>
  );
}
