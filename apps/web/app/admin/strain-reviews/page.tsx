"use client";

import { List } from "@refinedev/antd";
import {
  App,
  Button,
  Drawer,
  Input,
  Modal,
  Switch,
  Table,
  Typography,
} from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { stopAdminRowClick } from "@/lib/admin-clickable-table-row";

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
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);

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
      setDrawerRow(null);
      void load();
    } catch {
      message.error("Could not hide review");
    }
  }

  async function restore(id: string) {
    try {
      await adminAxios.post(`/strain-reviews/${id}/restore`, {});
      message.success("Review restored");
      setDrawerRow(null);
      void load();
    } catch {
      message.error("Could not restore review");
    }
  }

  return (
    <List title="Strain review moderation">
      <Typography.Paragraph type="secondary">
        Hidden reviews no longer appear on public strain pages.{" "}
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
        onRow={(record) => ({
          onClick: () => setDrawerRow(record),
          className: "admin-table-row-clickable",
          style: { cursor: "pointer" },
        })}
        columns={[
          {
            title: "Strain",
            render: (_: unknown, r) => (
              <span>
                <Link
                  href={`/strains/${encodeURIComponent(r.strainSlug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
                  onClick={stopAdminRowClick}
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
                onClick={stopAdminRowClick}
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
              <span className="flex flex-wrap gap-2" onClick={stopAdminRowClick}>
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
      <Drawer
        title="Strain review"
        width={520}
        open={drawerRow !== null}
        onClose={() => setDrawerRow(null)}
        destroyOnClose
      >
        {drawerRow ? (
          <>
            <Typography.Paragraph style={{ marginBottom: 4 }}>
              <Link
                href={`/strains/${encodeURIComponent(drawerRow.strainSlug)}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                {drawerRow.strainName}
              </Link>
              <Typography.Text type="secondary" className="ml-1 text-xs">
                ({drawerRow.strainSlug})
              </Typography.Text>
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
              <Link
                href={`/u/${drawerRow.authorId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                {drawerRow.authorName ?? drawerRow.authorId}
              </Link>
              {" · "}
              Rating {drawerRow.rating}
              {" · "}
              {new Date(drawerRow.createdAt).toLocaleString()}
            </Typography.Paragraph>
            {drawerRow.hiddenAt ? (
              <Typography.Paragraph type="warning">
                Hidden {new Date(drawerRow.hiddenAt).toLocaleString()}
                {drawerRow.hiddenReason ? ` — ${drawerRow.hiddenReason}` : ""}
              </Typography.Paragraph>
            ) : null}
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>
              {drawerRow.body?.trim() || "—"}
            </Typography.Paragraph>
            <div className="mt-4 flex flex-wrap gap-2">
              {drawerRow.hiddenAt ? (
                <Button onClick={() => void restore(drawerRow.id)}>Restore</Button>
              ) : (
                <Button danger onClick={() => setHideModalId(drawerRow.id)}>
                  Hide…
                </Button>
              )}
            </div>
          </>
        ) : null}
      </Drawer>
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
