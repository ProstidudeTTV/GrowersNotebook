"use client";

import { List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { useInvalidate } from "@refinedev/core";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Space,
  Table,
  Typography,
} from "antd";
import Link from "next/link";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";

const { Text } = Typography;

function AdminPostsInner() {
  const invalidate = useInvalidate();
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId");
  const permanentFilters = useMemo(
    () =>
      communityId
        ? [
            {
              field: "communityId",
              operator: "eq" as const,
              value: communityId,
            },
          ]
        : [],
    [communityId],
  );

  const { tableProps, searchFormProps } = useTable({
    resource: "posts",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
    filters: { permanent: permanentFilters },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [notifyAuthor, setNotifyAuthor] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const openRemove = (record: BaseRecord) => {
    setTarget({
      id: String(record.id),
      title: String(record.title ?? ""),
    });
    setNotifyAuthor(false);
    setReason("");
    setError(null);
    setModalOpen(true);
  };

  const togglePin = async (record: BaseRecord) => {
    const id = String(record.id);
    const hasCommunity = Boolean(record.communityId);
    if (!hasCommunity) return;
    setPinBusyId(id);
    setPinError(null);
    try {
      const pinned = Boolean(record.pinnedAt);
      if (pinned) {
        await adminAxios.delete(`posts/${id}/pin`);
      } else {
        await adminAxios.post(`posts/${id}/pin`);
      }
      await invalidate({ resource: "posts", invalidates: ["list"] });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Pin update failed";
      setPinError(msg);
    } finally {
      setPinBusyId(null);
    }
  };

  const confirmRemove = async () => {
    if (!target) return;
    if (notifyAuthor && !reason.trim()) {
      setError("Add a reason for the author when notification is enabled.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await adminAxios.post(`posts/${target.id}/remove`, {
        notifyAuthor,
        reason: notifyAuthor ? reason.trim() : undefined,
      });
      setModalOpen(false);
      setTarget(null);
      await invalidate({ resource: "posts", invalidates: ["list"] });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Remove failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <List
        title="Posts"
        headerButtons={
          communityId ? (
            <Link href="/admin/posts">
              <Button type="link">Clear community filter</Button>
            </Link>
          ) : undefined
        }
      >
        {communityId ? (
          <Text type="secondary" className="mb-4 block">
            Filtered by community ID{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">
              {communityId}
            </code>
            .{" "}
            <Link href={`/admin/communities/edit/${communityId}`}>
              Edit community
            </Link>
          </Text>
        ) : null}
        {pinError ? (
          <p className="mb-3 text-sm text-red-500">{pinError}</p>
        ) : null}
        <RefineHiddenSearchForm searchFormProps={searchFormProps} />
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="title" title="Title" />
          <Table.Column dataIndex="communitySlug" title="Community" />
          <Table.Column dataIndex="authorName" title="Author" />
          <Table.Column<BaseRecord>
            dataIndex="pinnedAt"
            title="Pinned"
            render={(v: unknown, record) =>
              record.communityId
                ? v
                  ? new Date(String(v)).toLocaleString()
                  : "—"
                : "—"
            }
          />
          <Table.Column
            dataIndex="createdAt"
            title="Created"
            render={(v: string) => new Date(v).toLocaleString()}
          />
          <Table.Column<BaseRecord>
            title="Actions"
            render={(_, record) => (
              <Space>
                <Link href={`/p/${record.id}`} target="_blank">
                  View
                </Link>
                {record.communityId ? (
                  <Button
                    size="small"
                    loading={pinBusyId === String(record.id)}
                    onClick={() => void togglePin(record)}
                  >
                    {record.pinnedAt ? "Unpin" : "Pin"}
                  </Button>
                ) : null}
                <Button
                  danger
                  size="small"
                  type="primary"
                  onClick={() => openRemove(record)}
                >
                  Remove…
                </Button>
              </Space>
            )}
          />
        </Table>
      </List>

      <Modal
        title="Remove post"
        open={modalOpen}
        onCancel={() => !submitting && setModalOpen(false)}
        onOk={() => void confirmRemove()}
        okText={submitting ? "Removing…" : "Remove post"}
        okButtonProps={{ danger: true, loading: submitting }}
        destroyOnHidden
      >
        <p className="mb-3">
          This permanently deletes{" "}
          <strong>{target?.title ?? "this post"}</strong> and its comments.
        </p>
        <Checkbox
          checked={notifyAuthor}
          onChange={(e) => setNotifyAuthor(e.target.checked)}
        >
          Notify author (shows in their profile menu)
        </Checkbox>
        {notifyAuthor ? (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">
              Reason (sent to the author)
            </label>
            <Input.TextArea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the post was removed"
            />
          </div>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        ) : null}
      </Modal>
    </>
  );
}

export default function AdminPostsPage() {
  return (
    <Suspense
      fallback={
        <List title="Posts">
          <div className="px-4 py-6">Loading…</div>
        </List>
      }
    >
      <AdminPostsInner />
    </Suspense>
  );
}
