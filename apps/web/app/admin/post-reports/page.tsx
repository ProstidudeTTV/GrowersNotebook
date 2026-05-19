"use client";

import { List, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Button, Checkbox, Input, Modal, Table, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import {
  AdminDismissReportModal,
  type AdminDismissReportPayload,
} from "../admin-dismiss-report-modal";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminPostReportsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const invalidate = useInvalidate();

  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [dismissReportId, setDismissReportId] = useState<string | null>(null);
  const [dismissLoading, setDismissLoading] = useState(false);

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    postId: string;
    postTitle: string;
  } | null>(null);
  const [notifyAuthor, setNotifyAuthor] = useState(false);
  const [reason, setReason] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const { tableProps, searchFormProps } = useTable({
    resource: "post-reports",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  const openRemoveModal = (postId: string, postTitle: string) => {
    setRemoveTarget({ postId, postTitle });
    setNotifyAuthor(false);
    setReason("");
    setRemoveError(null);
    setRemoveOpen(true);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    if (notifyAuthor && !reason.trim()) {
      setRemoveError("Add a reason for the author when notification is enabled.");
      return;
    }
    setRemoveError(null);
    setRemoveSubmitting(true);
    try {
      await adminAxios.post(`posts/${removeTarget.postId}/remove`, {
        notifyAuthor,
        reason: notifyAuthor ? reason.trim() : undefined,
      });
      message.success("Post removed");
      setRemoveOpen(false);
      setRemoveTarget(null);
      await invalidate({ resource: "post-reports", invalidates: ["list"] });
    } catch {
      setRemoveError("Could not remove post");
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const submitDismiss = async (payload: AdminDismissReportPayload) => {
    if (!dismissReportId) return;
    setDismissLoading(true);
    try {
      await adminAxios.patch(
        `post-reports/${dismissReportId}/dismiss`,
        payload,
      );
      message.success("Report resolved; reporter notified.");
      setDismissReportId(null);
      await invalidate({ resource: "post-reports", invalidates: ["list"] });
    } catch {
      message.error("Could not resolve report");
    } finally {
      setDismissLoading(false);
    }
  };

  return (
    <List title="Post reports">
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => {
          const r = record as { postId: string };
          return adminClickableRowTo(router, `/p/${r.postId}`);
        }}
      >
        <Table.Column
          dataIndex="createdAt"
          title="Reported"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column dataIndex="reporterName" title="Reporter" />
        <Table.Column
          dataIndex="postTitle"
          title="Post"
          render={(title: string, r: { postId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/p/${r.postId}`}
              target="_blank"
              rel="noreferrer"
              onClick={stopAdminRowClick}
            >
              {title}
            </Link>
          )}
        />
        <Table.Column dataIndex="authorName" title="Author" />
        <Table.Column
          title="Post preview"
          width={280}
          render={(_: unknown, r: { postBody?: string; postPreview?: string }) => {
            const t = (r.postBody ?? r.postPreview ?? "").trim();
            if (!t) return "—";
            return (
              <Typography.Paragraph
                className="mb-0 max-h-32 overflow-y-auto text-xs"
                copyable={{ text: t }}
              >
                {t}
              </Typography.Paragraph>
            );
          }}
        />
        <Table.Column dataIndex="reason" title="Reason" ellipsis />
        <Table.Column
          title="Moderation"
          render={(_: unknown, r: { postId: string; id: string; postTitle?: string }) => (
            <span className="flex flex-wrap gap-2" onClick={stopAdminRowClick}>
              <Button size="small" onClick={() => setDismissReportId(r.id)}>
                No action / mark safe
              </Button>
              <Button
                danger
                size="small"
                loading={busyPostId === r.postId}
                onClick={() => {
                  setBusyPostId(r.postId);
                  openRemoveModal(r.postId, r.postTitle ?? "this post");
                  setBusyPostId(null);
                }}
              >
                Remove post…
              </Button>
            </span>
          )}
        />
      </Table>

      <Modal
        title="Remove post"
        open={removeOpen}
        onCancel={() => !removeSubmitting && setRemoveOpen(false)}
        onOk={() => void confirmRemove()}
        okText={removeSubmitting ? "Removing…" : "Remove post"}
        okButtonProps={{ danger: true, loading: removeSubmitting }}
        destroyOnHidden
      >
        <p className="mb-3">
          This permanently deletes{" "}
          <strong>{removeTarget?.postTitle ?? "this post"}</strong> and its
          comments.
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
        {removeError ? (
          <p className="mt-3 text-sm text-red-500">{removeError}</p>
        ) : null}
      </Modal>

      <AdminDismissReportModal
        open={dismissReportId !== null}
        title="Resolve post report (no violation)"
        confirmLoading={dismissLoading}
        onCancel={() => setDismissReportId(null)}
        onFinish={(v) => void submitDismiss(v)}
      />
    </List>
  );
}
