"use client";

import { List } from "@refinedev/antd";
import { App, Button, Input, Modal, Table, Typography } from "antd";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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

const PAGE_SIZE = 20;

function kindLink(kind: string, id: string) {
  return (
    <Link
      href={`/admin/catalog-suggestions/review/${id}`}
      className="font-medium text-[#1677ff] hover:underline"
    >
      {kind}
    </Link>
  );
}

function payloadCell(r: Row) {
  return (
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
  );
}

export default function AdminCatalogSuggestionsPage() {
  const { message } = App.useApp();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [pending, setPending] = useState<{
    rows: Row[];
    total: number;
    page: number;
    loading: boolean;
  }>({ rows: [], total: 0, page: 1, loading: false });
  const [approved, setApproved] = useState<{
    rows: Row[];
    total: number;
    page: number;
    loading: boolean;
  }>({ rows: [], total: 0, page: 1, loading: false });
  const [rejected, setRejected] = useState<{
    rows: Row[];
    total: number;
    page: number;
    loading: boolean;
  }>({ rows: [], total: 0, page: 1, loading: false });

  const loadSection = useCallback(
    async (
      status: "pending" | "approved" | "rejected",
      page: number,
      setState: Dispatch<
        SetStateAction<{
          rows: Row[];
          total: number;
          page: number;
          loading: boolean;
        }>
      >,
    ) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const res = await adminAxios.get<Row[]>("/catalog-suggestions", {
          params: { _start: start, _end: end, status },
        });
        const n = res.headers["x-total-count"];
        setState({
          rows: res.data,
          total: n ? Number(n) : res.data.length,
          page,
          loading: false,
        });
      } catch {
        message.error(`Could not load ${status} suggestions`);
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [message],
  );

  useEffect(() => {
    void loadSection("pending", pending.page, setPending);
  }, [loadSection, pending.page]);

  useEffect(() => {
    void loadSection("approved", approved.page, setApproved);
  }, [loadSection, approved.page]);

  useEffect(() => {
    void loadSection("rejected", rejected.page, setRejected);
  }, [loadSection, rejected.page]);

  const refreshPending = useCallback(() => {
    void loadSection("pending", pending.page, setPending);
  }, [loadSection, pending.page]);

  const refreshApproved = useCallback(() => {
    void loadSection("approved", approved.page, setApproved);
  }, [loadSection, approved.page]);

  const refreshRejected = useCallback(() => {
    void loadSection("rejected", rejected.page, setRejected);
  }, [loadSection, rejected.page]);

  async function approve(id: string) {
    try {
      await adminAxios.patch(`/catalog-suggestions/${id}`, {
        action: "approve",
      });
      message.success("Approved");
      refreshPending();
      refreshApproved();
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
      refreshPending();
      refreshRejected();
    } catch {
      message.error("Reject failed");
    }
  }

  return (
    <List title="Catalog suggestions inbox">
      <Typography.Paragraph type="secondary">
        Approve applies creates or patches catalog rows from the payload. This
        inbox is separate from review moderation. Resolved items appear in{" "}
        <strong>Approved</strong> and <strong>Rejected</strong> below.
      </Typography.Paragraph>

      <Typography.Title level={4} style={{ marginTop: 24 }}>
        Pending
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Awaiting moderation — oldest submissions first.
      </Typography.Paragraph>
      <Table<Row>
        rowKey="id"
        loading={pending.loading}
        dataSource={pending.rows}
        pagination={{
          current: pending.page,
          pageSize: PAGE_SIZE,
          total: pending.total,
          showSizeChanger: false,
          onChange: (p) => setPending((s) => ({ ...s, page: p })),
        }}
        columns={[
          {
            title: "Created",
            render: (_: unknown, r: Row) =>
              new Date(r.createdAt).toLocaleString(),
          },
          {
            title: "Kind",
            dataIndex: "kind",
            render: (kind: string, r: Row) => kindLink(kind, r.id),
          },
          {
            title: "Submitted by",
            dataIndex: "suggestedBy",
            ellipsis: true,
          },
          {
            title: "Payload",
            render: (_: unknown, r: Row) => payloadCell(r),
          },
          {
            title: "Actions",
            render: (_: unknown, r: Row) => (
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

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        Approved
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Applied to the catalog — most recently resolved first.
      </Typography.Paragraph>
      <Table<Row>
        rowKey="id"
        loading={approved.loading}
        dataSource={approved.rows}
        pagination={{
          current: approved.page,
          pageSize: PAGE_SIZE,
          total: approved.total,
          showSizeChanger: false,
          onChange: (p) => setApproved((s) => ({ ...s, page: p })),
        }}
        columns={[
          {
            title: "Submitted",
            render: (_: unknown, r: Row) =>
              new Date(r.createdAt).toLocaleString(),
          },
          {
            title: "Approved at",
            render: (_: unknown, r: Row) =>
              r.moderatedAt
                ? new Date(r.moderatedAt).toLocaleString()
                : "—",
          },
          {
            title: "Kind",
            dataIndex: "kind",
            render: (kind: string, r: Row) => kindLink(kind, r.id),
          },
          {
            title: "Submitted by",
            dataIndex: "suggestedBy",
            ellipsis: true,
          },
          {
            title: "Moderator",
            dataIndex: "moderatedBy",
            ellipsis: true,
            render: (id: string | null | undefined) => id ?? "—",
          },
          {
            title: "Payload",
            render: (_: unknown, r: Row) => payloadCell(r),
          },
          {
            title: "",
            width: 100,
            render: (_: unknown, r: Row) => (
              <Link href={`/admin/catalog-suggestions/review/${r.id}`}>
                <Button size="small">View</Button>
              </Link>
            ),
          },
        ]}
      />

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        Rejected
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Not applied — most recently resolved first.
      </Typography.Paragraph>
      <Table<Row>
        rowKey="id"
        loading={rejected.loading}
        dataSource={rejected.rows}
        pagination={{
          current: rejected.page,
          pageSize: PAGE_SIZE,
          total: rejected.total,
          showSizeChanger: false,
          onChange: (p) => setRejected((s) => ({ ...s, page: p })),
        }}
        columns={[
          {
            title: "Submitted",
            render: (_: unknown, r: Row) =>
              new Date(r.createdAt).toLocaleString(),
          },
          {
            title: "Rejected at",
            render: (_: unknown, r: Row) =>
              r.moderatedAt
                ? new Date(r.moderatedAt).toLocaleString()
                : "—",
          },
          {
            title: "Kind",
            dataIndex: "kind",
            render: (kind: string, r: Row) => kindLink(kind, r.id),
          },
          {
            title: "Submitted by",
            dataIndex: "suggestedBy",
            ellipsis: true,
          },
          {
            title: "Moderator",
            dataIndex: "moderatedBy",
            ellipsis: true,
            render: (id: string | null | undefined) => id ?? "—",
          },
          {
            title: "Reason",
            dataIndex: "rejectReason",
            ellipsis: true,
            render: (reason: string | null | undefined) =>
              reason?.trim() ? reason : "—",
          },
          {
            title: "Payload",
            render: (_: unknown, r: Row) => payloadCell(r),
          },
          {
            title: "",
            width: 100,
            render: (_: unknown, r: Row) => (
              <Link href={`/admin/catalog-suggestions/review/${r.id}`}>
                <Button size="small">View</Button>
              </Link>
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
