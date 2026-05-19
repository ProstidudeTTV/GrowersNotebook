"use client";

import { useTable } from "@refinedev/antd";
import { Button, Card, Col, Row, Space, Statistic } from "antd";
import Link from "next/link";

function useTotalCount(resource: string): number | undefined {
  const { tableProps } = useTable({
    resource,
    pagination: { pageSize: 1 },
  });
  return tableProps.pagination !== false
    ? tableProps.pagination?.total
    : undefined;
}

function RecentReports() {
  const { tableProps: postReports } = useTable({
    resource: "post-reports",
    pagination: { pageSize: 5 },
  });
  const { tableProps: commentReports } = useTable({
    resource: "comment-reports",
    pagination: { pageSize: 5 },
  });

  const postItems = (postReports.dataSource ?? []) as Array<{
    id: string;
    reason?: string;
    createdAt?: string;
  }>;
  const commentItems = (commentReports.dataSource ?? []) as Array<{
    id: string;
    reason?: string;
    createdAt?: string;
  }>;

  const combined = [
    ...postItems.map((p) => ({ ...p, kind: "Post" as const })),
    ...commentItems.map((c) => ({ ...c, kind: "Comment" as const })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    )
    .slice(0, 5);

  if (combined.length === 0) {
    return (
      <p className="text-sm text-[var(--gn-text-muted,#7fa887)]">
        🌿 No recent reports — the community is behaving!
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {combined.map((item) => (
        <li
          key={`${item.kind}-${item.id}`}
          className="flex items-center gap-3 rounded-lg border border-neutral-700/50 bg-neutral-800/30 px-3 py-2 text-sm"
        >
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
              item.kind === "Post"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-purple-500/20 text-purple-400"
            }`}
          >
            {item.kind}
          </span>
          <span className="flex-1 truncate text-neutral-300">
            {item.reason ?? "No reason given"}
          </span>
          {item.createdAt && (
            <span className="shrink-0 text-xs text-neutral-500">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          )}
          <Link
            href={
              item.kind === "Post"
                ? "/admin/post-reports"
                : "/admin/comment-reports"
            }
            className="shrink-0 text-xs text-[#1677ff] hover:underline dark:text-[#69b1ff]"
          >
            View →
          </Link>
        </li>
      ))}
    </ul>
  );
}

const QUICK_ACTIONS = [
  { href: "/admin/post-reports", label: "📝 Moderate Posts" },
  { href: "/admin/comment-reports", label: "💬 Review Comments" },
  { href: "/admin/communities/create", label: "🏘️ Add Community" },
  { href: "/admin/profiles", label: "👤 Manage Users" },
  { href: "/admin/strains/create", label: "🌿 Add Strain" },
  { href: "/admin/site-settings", label: "🔧 Site Settings" },
] as const;

export default function AdminDashboardPage() {
  const commentReportCount = useTotalCount("comment-reports");
  const postReportCount = useTotalCount("post-reports");
  const communityCount = useTotalCount("communities");
  const memberCount = useTotalCount("profiles");

  const hasAlerts =
    (postReportCount ?? 0) > 0 || (commentReportCount ?? 0) > 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <a
          href="https://growersnotebook.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[#1677ff] hover:underline dark:text-[#69b1ff]"
        >
          growersnotebook.com →
        </a>
      </div>

      {hasAlerts && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          ⚠️ You have open reports requiring attention — review the cards below.
        </div>
      )}

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/post-reports">
            <Card hoverable className="h-full cursor-pointer">
              <div className="mb-2 text-2xl">🚨</div>
              <Statistic
                title="Open Post Reports"
                value={postReportCount ?? "—"}
                valueStyle={
                  postReportCount
                    ? { color: "#cf1322", fontWeight: 700 }
                    : { fontWeight: 700 }
                }
              />
              <p className="mt-2 text-xs text-[var(--gn-text-muted,#7fa887)]">
                View &amp; moderate →
              </p>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/comment-reports">
            <Card hoverable className="h-full cursor-pointer">
              <div className="mb-2 text-2xl">🚨</div>
              <Statistic
                title="Open Comment Reports"
                value={commentReportCount ?? "—"}
                valueStyle={
                  commentReportCount
                    ? { color: "#cf1322", fontWeight: 700 }
                    : { fontWeight: 700 }
                }
              />
              <p className="mt-2 text-xs text-[var(--gn-text-muted,#7fa887)]">
                View &amp; moderate →
              </p>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/profiles">
            <Card hoverable className="h-full cursor-pointer">
              <div className="mb-2 text-2xl">👥</div>
              <Statistic
                title="Total Members"
                value={memberCount ?? "—"}
                valueStyle={{ fontWeight: 700 }}
              />
              <p className="mt-2 text-xs text-[var(--gn-text-muted,#7fa887)]">
                Manage users →
              </p>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/communities">
            <Card hoverable className="h-full cursor-pointer">
              <div className="mb-2 text-2xl">🏘️</div>
              <Statistic
                title="Total Communities"
                value={communityCount ?? "—"}
                valueStyle={{ fontWeight: 700 }}
              />
              <p className="mt-2 text-xs text-[var(--gn-text-muted,#7fa887)]">
                Manage communities →
              </p>
            </Card>
          </Link>
        </Col>
      </Row>

      <Card title="Quick Actions" className="mb-6">
        <Row gutter={[12, 12]}>
          {QUICK_ACTIONS.map(({ href, label }) => (
            <Col key={href} xs={12} sm={8} md={4}>
              <Link href={href}>
                <Button block>{label}</Button>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title="Recent Activity"
        extra={
          <Space>
            <Link href="/admin/post-reports">
              <Button type="link" size="small">
                All post reports
              </Button>
            </Link>
            <Link href="/admin/comment-reports">
              <Button type="link" size="small">
                All comment reports
              </Button>
            </Link>
          </Space>
        }
      >
        <RecentReports />
      </Card>
    </div>
  );
}
