"use client";

import { useTable } from "@refinedev/antd";
import { Button, Card, Col, Row, Space, Statistic } from "antd";
import Link from "next/link";

function useTotalCount(resource: string): number | undefined {
  const { tableProps } = useTable({
    resource,
    pagination: { pageSize: 1 },
  });
  return tableProps.pagination !== false ? tableProps.pagination?.total : undefined;
}

export default function AdminDashboardPage() {
  const commentReportCount = useTotalCount("comment-reports");
  const postReportCount = useTotalCount("post-reports");
  const communityCount = useTotalCount("communities");
  const memberCount = useTotalCount("profiles");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Admin Dashboard</h1>

      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12} xl={6}>
          <Card hoverable>
            <Statistic
              title={
                <Link href="/admin/comment-reports" className="hover:underline">
                  Open Comment Reports
                </Link>
              }
              value={commentReportCount ?? "—"}
              valueStyle={
                commentReportCount ? { color: "#cf1322" } : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card hoverable>
            <Statistic
              title={
                <Link href="/admin/post-reports" className="hover:underline">
                  Open Post Reports
                </Link>
              }
              value={postReportCount ?? "—"}
              valueStyle={
                postReportCount ? { color: "#cf1322" } : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card hoverable>
            <Statistic
              title={
                <Link href="/admin/communities" className="hover:underline">
                  Total Communities
                </Link>
              }
              value={communityCount ?? "—"}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card hoverable>
            <Statistic
              title={
                <Link href="/admin/profiles" className="hover:underline">
                  Total Members
                </Link>
              }
              value={memberCount ?? "—"}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Quick Actions">
        <Space wrap>
          <Link href="/admin/post-reports">
            <Button>View Post Reports</Button>
          </Link>
          <Link href="/admin/comment-reports">
            <Button>View Comment Reports</Button>
          </Link>
          <Link href="/admin/communities">
            <Button>View Communities</Button>
          </Link>
          <Link href="/admin/profiles">
            <Button>View Profiles</Button>
          </Link>
        </Space>
      </Card>
    </div>
  );
}
