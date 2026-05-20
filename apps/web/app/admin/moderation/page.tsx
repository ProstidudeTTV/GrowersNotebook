"use client";

import { List } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import {
  App,
  Button,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { adminApiErrorMessage } from "@/lib/admin-api-error";
import {
  AdminDismissReportModal,
  type AdminDismissReportPayload,
} from "../admin-dismiss-report-modal";

type PostReport = {
  id: string;
  createdAt: string;
  reason: string;
  postId: string;
  postTitle: string | null;
  authorName: string | null;
  reporterName: string | null;
};

type CommentReport = {
  id: string;
  createdAt: string;
  reason: string;
  commentId: string;
  postId: string;
  postTitle: string | null;
  reporterName: string | null;
  commentPreview: string | null;
};

type ProfileReport = {
  id: string;
  createdAt: string;
  reason: string;
  reportedUserId: string;
  reportedName: string | null;
  reporterName: string | null;
};

type QueueRow =
  | { kind: "post"; id: string; createdAt: string; reason: string; href: string; subject: string; reporter: string }
  | { kind: "comment"; id: string; createdAt: string; reason: string; href: string; subject: string; reporter: string }
  | { kind: "profile"; id: string; createdAt: string; reason: string; href: string; subject: string; reporter: string };

export default function AdminModerationHubPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [loading, setLoading] = useState(true);
  const [postReports, setPostReports] = useState<PostReport[]>([]);
  const [commentReports, setCommentReports] = useState<CommentReport[]>([]);
  const [profileReports, setProfileReports] = useState<ProfileReport[]>([]);
  const [tab, setTab] = useState("all");
  const [dismiss, setDismiss] = useState<{
    kind: "post" | "comment" | "profile";
    id: string;
  } | null>(null);
  const [dismissLoading, setDismissLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, commentsRes, profilesRes] = await Promise.all([
        adminAxios.get<PostReport[]>("/post-reports?_start=0&_end=100"),
        adminAxios.get<CommentReport[]>("/comment-reports?_start=0&_end=100"),
        adminAxios.get<ProfileReport[]>("/profile-reports?_start=0&_end=100"),
      ]);
      setPostReports(Array.isArray(postsRes.data) ? postsRes.data : []);
      setCommentReports(
        Array.isArray(commentsRes.data) ? commentsRes.data : [],
      );
      setProfileReports(
        Array.isArray(profilesRes.data) ? profilesRes.data : [],
      );
    } catch (e) {
      message.error(adminApiErrorMessage(e, "Could not load moderation queue."));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const allRows: QueueRow[] = useMemo(() => {
    const posts: QueueRow[] = postReports.map((r) => ({
      kind: "post" as const,
      id: r.id,
      createdAt: r.createdAt,
      reason: r.reason,
      href: `/p/${r.postId}`,
      subject: r.postTitle?.trim() || `Post ${r.postId.slice(0, 8)}…`,
      reporter: r.reporterName?.trim() || "—",
    }));
    const comments: QueueRow[] = commentReports.map((r) => ({
      kind: "comment" as const,
      id: r.id,
      createdAt: r.createdAt,
      reason: r.reason,
      href: `/p/${r.postId}`,
      subject:
        r.commentPreview?.trim() ||
        r.postTitle?.trim() ||
        `Comment on post ${r.postId.slice(0, 8)}…`,
      reporter: r.reporterName?.trim() || "—",
    }));
    const profiles: QueueRow[] = profileReports.map((r) => ({
      kind: "profile" as const,
      id: r.id,
      createdAt: r.createdAt,
      reason: r.reason,
      href: `/u/${r.reportedUserId}`,
      subject: r.reportedName?.trim() || r.reportedUserId.slice(0, 8),
      reporter: r.reporterName?.trim() || "—",
    }));
    return [...posts, ...comments, ...profiles].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [postReports, commentReports, profileReports]);

  const visibleRows = useMemo(() => {
    if (tab === "posts") return allRows.filter((r) => r.kind === "post");
    if (tab === "comments") return allRows.filter((r) => r.kind === "comment");
    if (tab === "profiles") return allRows.filter((r) => r.kind === "profile");
    return allRows;
  }, [allRows, tab]);

  const submitDismiss = async (payload: AdminDismissReportPayload) => {
    if (!dismiss) return;
    setDismissLoading(true);
    try {
      const path =
        dismiss.kind === "post"
          ? `post-reports/${dismiss.id}/dismiss`
          : dismiss.kind === "comment"
            ? `comment-reports/${dismiss.id}/dismiss`
            : `profile-reports/${dismiss.id}/dismiss`;
      await adminAxios.patch(path, payload);
      message.success("Report resolved.");
      setDismiss(null);
      await load();
      await invalidate({
        resource: `${dismiss.kind}-reports`,
        invalidates: ["list"],
      });
    } catch (e) {
      message.error(adminApiErrorMessage(e, "Could not resolve report."));
    } finally {
      setDismissLoading(false);
    }
  };

  const kindTag = (kind: QueueRow["kind"]) => {
    if (kind === "post") return <Tag color="blue">Post</Tag>;
    if (kind === "comment") return <Tag color="purple">Comment</Tag>;
    return <Tag color="orange">Profile</Tag>;
  };

  return (
    <List
      title="Moderation hub"
      headerButtons={
        <Space>
          <Button onClick={() => void load()}>Refresh</Button>
          <Link href="/admin/post-reports">
            <Button type="link">Post reports →</Button>
          </Link>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" className="mb-4">
        Unified inbox for open reports. Dismiss here or open the dedicated
        queues for remove/ban actions.
      </Typography.Paragraph>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "all",
            label: `All (${allRows.length})`,
          },
          {
            key: "posts",
            label: `Posts (${postReports.length})`,
          },
          {
            key: "comments",
            label: `Comments (${commentReports.length})`,
          },
          {
            key: "profiles",
            label: `Profiles (${profileReports.length})`,
          },
        ]}
      />

      <Table
        rowKey={(r) => `${r.kind}-${r.id}`}
        loading={loading}
        dataSource={visibleRows}
        pagination={{ pageSize: 25 }}
        columns={[
          {
            title: "Type",
            width: 100,
            render: (_: unknown, row: QueueRow) => kindTag(row.kind),
          },
          {
            title: "Reason",
            dataIndex: "reason",
            ellipsis: true,
          },
          {
            title: "Subject",
            dataIndex: "subject",
            ellipsis: true,
            render: (subject: string, row: QueueRow) =>
              row.href.startsWith("#") ? (
                subject
              ) : (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--gn-accent,#4ade80)] hover:underline"
                >
                  {subject}
                </a>
              ),
          },
          {
            title: "Reporter",
            dataIndex: "reporter",
            width: 140,
          },
          {
            title: "Reported",
            dataIndex: "createdAt",
            width: 170,
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: "Actions",
            width: 220,
            render: (_: unknown, row: QueueRow) => (
              <Space wrap onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  onClick={() =>
                    setDismiss({ kind: row.kind, id: row.id })
                  }
                >
                  Resolve
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    const adminPath =
                      row.kind === "post"
                        ? "/admin/post-reports"
                        : row.kind === "comment"
                          ? "/admin/comment-reports"
                          : "/admin/profile-reports";
                    router.push(adminPath);
                  }}
                >
                  Full tools →
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <AdminDismissReportModal
        open={dismiss != null}
        title="Resolve report"
        confirmLoading={dismissLoading}
        onCancel={() => setDismiss(null)}
        onFinish={(p) => void submitDismiss(p)}
      />
    </List>
  );
}
