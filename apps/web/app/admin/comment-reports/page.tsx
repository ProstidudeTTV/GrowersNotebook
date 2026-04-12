"use client";

import { List, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Button, Table, Typography } from "antd";
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

export default function AdminCommentReportsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [dismissReportId, setDismissReportId] = useState<string | null>(null);
  const [dismissLoading, setDismissLoading] = useState(false);
  const { tableProps, searchFormProps } = useTable({
    resource: "comment-reports",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  const removeComment = async (commentId: string) => {
    if (
      !window.confirm(
        "Permanently delete this comment and all nested replies?",
      )
    ) {
      return;
    }
    setBusyCommentId(commentId);
    try {
      await adminAxios.delete(`comments/${commentId}`);
      message.success("Comment removed");
      await invalidate({
        resource: "comment-reports",
        invalidates: ["list"],
      });
    } catch {
      message.error("Could not remove comment");
    } finally {
      setBusyCommentId(null);
    }
  };

  const submitDismiss = async (payload: AdminDismissReportPayload) => {
    if (!dismissReportId) return;
    setDismissLoading(true);
    try {
      await adminAxios.patch(
        `comment-reports/${dismissReportId}/dismiss`,
        payload,
      );
      message.success("Report resolved; reporter notified.");
      setDismissReportId(null);
      await invalidate({
        resource: "comment-reports",
        invalidates: ["list"],
      });
    } catch {
      message.error("Could not resolve report");
    } finally {
      setDismissLoading(false);
    }
  };

  return (
    <List title="Comment reports">
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => {
          const r = record as { postId: string; commentId: string };
          return adminClickableRowTo(
            router,
            `/p/${r.postId}#comment-${r.commentId}`,
          );
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
        <Table.Column
          dataIndex="commentPreview"
          title="Comment preview"
          ellipsis
        />
        <Table.Column
          title="Full comment"
          width={280}
          render={(_: unknown, r: { commentBody?: string }) => {
            const t = r.commentBody?.trim() || "";
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
          title="Context"
          render={(_: unknown, r: { postId: string; commentId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/p/${r.postId}#comment-${r.commentId}`}
              target="_blank"
              rel="noreferrer"
              onClick={stopAdminRowClick}
            >
              View thread
            </Link>
          )}
        />
        <Table.Column
          title="Moderation"
          render={(_: unknown, r: { commentId: string; id: string }) => (
            <span
              className="flex flex-wrap gap-2"
              onClick={stopAdminRowClick}
            >
              <Button
                size="small"
                onClick={() => setDismissReportId(r.id)}
              >
                No action / mark safe
              </Button>
              <Button
                danger
                size="small"
                loading={busyCommentId === r.commentId}
                onClick={() => void removeComment(r.commentId)}
              >
                Delete comment
              </Button>
            </span>
          )}
        />
      </Table>
      <AdminDismissReportModal
        open={dismissReportId !== null}
        title="Resolve comment report (no violation)"
        confirmLoading={dismissLoading}
        onCancel={() => setDismissReportId(null)}
        onFinish={(v) => void submitDismiss(v)}
      />
    </List>
  );
}
