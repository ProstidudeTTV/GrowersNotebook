"use client";

import { List } from "@refinedev/antd";
import { App, Button, Input, Modal, Switch, Table, Typography } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";

type Row = {
  id: string;
  strainId: string;
  strainSlug: string;
  strainName: string;
  authorId: string;
  authorName: string | null;
  rating: string;
  body: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
};

export default function AdminStrainReviewsPage() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const strainIdFilter = searchParams.get("strainId") ?? undefined;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [hideModalId, setHideModalId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const params: Record<string, string> = {
        _start: String(start),
        _end: String(end),
      };
      if (hiddenOnly) params.hiddenOnly = "true";
      if (strainIdFilter) params.strainId = strainIdFilter;
      const res = await adminAxios.get<Row[]>("/strain-reviews", { params });
      setRows(res.data);
      const n = res.headers["x-total-count"];
      setTotal(n ? Number(n) : res.data.length);
    } catch {
      message.error("Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, hiddenOnly, strainIdFilter, message]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [hiddenOnly, strainIdFilter]);

  async function hideReview() {
    if (!hideModalId) return;
    try {
      await adminAxios.post(`/strain-reviews/${hideModalId}/hide`, {
        reason: hideReason.trim() || null,
      });
      message.success("Review hidden");
      setHideModalId(null);
      setHideReason("");
      void load();
    } catch {
      message.error("Could not hide review");
    }
  }

  async function restore(id: string) {
    try {
      await adminAxios.post(`/strain-reviews/${id}/restore`, {});
      message.success("Review restored");
      void load();
    } catch {
      message.error("Could not restore review");
    }
  }

  return (
    <List title="Cultivar review moderation">
      <Typography.Paragraph type="secondary">
        Hidden reviews no longer appear on public cultivar pages.{" "}
        {strainIdFilter ? (
          <>
            Filtered by strain ID{" "}
            <Typography.Text code>{strainIdFilter}</Typography.Text> —{" "}
            <Link href="/admin/strain-reviews">clear</Link>
          </>
        ) : null}
      </Typography.Paragraph>
      <div className="mb-3 flex items-center gap-2">
        <Switch checked={hiddenOnly} onChange={setHiddenOnly} id="hidden-only" />
        <label htmlFor="hidden-only" className="text-sm">
          Hidden only
        </label>
      </div>
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
            title: "Cultivar",
            render: (_: unknown, r) => (
              <span>
                <Link
                  href={`/strains/${encodeURIComponent(r.strainSlug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
                >
                  {r.strainName}
                </Link>
                <Typography.Text type="secondary" className="ml-1 text-xs">
                  ({r.strainSlug})
                </Typography.Text>
              </span>
            ),
          },
          {
            title: "Author",
            dataIndex: "authorName",
            render: (v: string | null, r) => (
              <Link
                href={`/u/${r.authorId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                {v ?? r.authorId}
              </Link>
            ),
          },
          { title: "Rating", dataIndex: "rating" },
          {
            title: "Body",
            dataIndex: "body",
            ellipsis: true,
            render: (v: string) => v?.trim() || "—",
          },
          {
            title: "Hidden",
            render: (_: unknown, r) =>
              r.hiddenAt
                ? `${new Date(r.hiddenAt).toLocaleString()}${r.hiddenReason ? ` — ${r.hiddenReason}` : ""}`
                : "—",
          },
          {
            title: "Actions",
            render: (_: unknown, r) => (
              <span className="flex flex-wrap gap-2">
                {r.hiddenAt ? (
                  <Button size="small" onClick={() => void restore(r.id)}>
                    Restore
                  </Button>
                ) : (
                  <Button size="small" danger onClick={() => setHideModalId(r.id)}>
                    Hide
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      <Modal
        title="Hide review"
        open={hideModalId !== null}
        onOk={() => void hideReview()}
        onCancel={() => {
          setHideModalId(null);
          setHideReason("");
        }}
      >
        <Input.TextArea
          placeholder="Reason (optional)"
          value={hideReason}
          onChange={(e) => setHideReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </List>
  );
}
