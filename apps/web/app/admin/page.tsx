"use client";

import { useTable } from "@refinedev/antd";
import { Button, Card, Col, Row, Space, Statistic } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { useAdminStaff } from "./admin-staff-context";

type ModStats = {
  openPostReports: number;
  openCommentReports: number;
  openProfileReports: number;
};

function useTotalCount(resource: string): number | undefined {
  const { tableProps } = useTable({
    resource,
    pagination: { pageSize: 1 },
  });
  return tableProps.pagination !== false
    ? tableProps.pagination?.total
    : undefined;
}

const ADMIN_QUICK_ACTIONS = [
  { href: "/admin/moderation", label: "🛡️ Moderation hub" },
  { href: "/admin/post-reports", label: "📝 Post reports" },
  { href: "/admin/comment-reports", label: "💬 Comment reports" },
  { href: "/admin/profile-reports", label: "👤 Profile reports" },
  { href: "/admin/communities/create", label: "🏘️ Add community" },
  { href: "/admin/profiles", label: "👥 Manage users" },
  { href: "/admin/strains/create", label: "🌿 Add strain" },
  { href: "/admin/site-settings", label: "🔧 Site settings" },
] as const;

const MODERATOR_QUICK_ACTIONS = [
  { href: "/admin/moderation", label: "🛡️ Moderation hub" },
  { href: "/admin/post-reports", label: "📝 Post reports" },
  { href: "/admin/comment-reports", label: "💬 Comment reports" },
  { href: "/admin/profile-reports", label: "👤 Profile reports" },
  { href: "/admin/profiles", label: "👥 Manage users" },
  { href: "/admin/catalog-suggestions", label: "📥 Catalog inbox" },
] as const;

export default function AdminDashboardPage() {
  const { isAdmin } = useAdminStaff();
  const [stats, setStats] = useState<ModStats | null>(null);
  const commentReportCount = useTotalCount("comment-reports");
  const postReportCount = useTotalCount("post-reports");
  const profileReportCount = useTotalCount("profile-reports");
  const communityCount = useTotalCount("communities");
  const memberCount = useTotalCount("profiles");

  useEffect(() => {
    void adminAxios
      .get<ModStats>("/moderation-stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  const openPosts = stats?.openPostReports ?? postReportCount ?? 0;
  const openComments = stats?.openCommentReports ?? commentReportCount ?? 0;
  const openProfiles = stats?.openProfileReports ?? profileReportCount ?? 0;
  const hasAlerts = openPosts > 0 || openComments > 0 || openProfiles > 0;
  const quickActions = isAdmin ? ADMIN_QUICK_ACTIONS : MODERATOR_QUICK_ACTIONS;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--gn-text)]">
          Admin dashboard
        </h1>
        <a
          href="https://growersnotebook.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[var(--gn-accent)] hover:underline"
        >
          View live site →
        </a>
      </div>

      {hasAlerts ? (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          You have open reports — start in the{" "}
          <Link href="/admin/moderation" className="font-semibold underline">
            moderation hub
          </Link>
          .
        </div>
      ) : null}

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/moderation">
            <Card hoverable className="h-full cursor-pointer">
              <Statistic
                title="Open post reports"
                value={openPosts}
                valueStyle={
                  openPosts > 0
                    ? { color: "#f87171", fontWeight: 700 }
                    : { fontWeight: 700 }
                }
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/moderation">
            <Card hoverable className="h-full cursor-pointer">
              <Statistic
                title="Open comment reports"
                value={openComments}
                valueStyle={
                  openComments > 0
                    ? { color: "#f87171", fontWeight: 700 }
                    : { fontWeight: 700 }
                }
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Link href="/admin/moderation">
            <Card hoverable className="h-full cursor-pointer">
              <Statistic
                title="Open profile reports"
                value={openProfiles}
                valueStyle={
                  openProfiles > 0
                    ? { color: "#f87171", fontWeight: 700 }
                    : { fontWeight: 700 }
                }
              />
            </Card>
          </Link>
        </Col>
        {isAdmin ? (
          <>
            <Col xs={24} sm={12} xl={6}>
              <Link href="/admin/profiles">
                <Card hoverable className="h-full cursor-pointer">
                  <Statistic
                    title="Total members"
                    value={memberCount ?? "—"}
                    valueStyle={{ fontWeight: 700 }}
                  />
                </Card>
              </Link>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Link href="/admin/communities">
                <Card hoverable className="h-full cursor-pointer">
                  <Statistic
                    title="Communities"
                    value={communityCount ?? "—"}
                    valueStyle={{ fontWeight: 700 }}
                  />
                </Card>
              </Link>
            </Col>
          </>
        ) : null}
      </Row>

      <Card title="Quick actions" className="mb-6">
        <Row gutter={[12, 12]}>
          {quickActions.map(({ href, label }) => (
            <Col key={href} xs={12} sm={8} md={6}>
              <Link href={href}>
                <Button block>{label}</Button>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title="Moderation shortcuts"
        extra={
          <Space>
            <Link href="/admin/audit-log">
              <Button type="link" size="small">
                Audit log
              </Button>
            </Link>
            <Link href="/admin/moderation">
              <Button type="link" size="small">
                Open hub
              </Button>
            </Link>
          </Space>
        }
      >
        <p className="text-sm text-[var(--gn-text-muted)]">
          Use the moderation hub for a single inbox of open reports. Dedicated
          queues still support remove post, delete comment, and profile bans.
        </p>
      </Card>
    </div>
  );
}
