"use client";

import { List, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Button, Table, Tag, Typography } from "antd";
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

export default function AdminProfileReportsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [dismissReportId, setDismissReportId] = useState<string | null>(null);
  const [dismissLoading, setDismissLoading] = useState(false);
  const { tableProps, searchFormProps } = useTable({
    resource: "profile-reports",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  const submitDismiss = async (payload: AdminDismissReportPayload) => {
    if (!dismissReportId) return;
    setDismissLoading(true);
    try {
      await adminAxios.patch(
        `profile-reports/${dismissReportId}/dismiss`,
        payload,
      );
      message.success("Report resolved; reporter notified.");
      setDismissReportId(null);
      await invalidate({
        resource: "profile-reports",
        invalidates: ["list"],
      });
    } catch {
      message.error("Could not resolve report");
    } finally {
      setDismissLoading(false);
    }
  };

  return (
    <List title="Profile reports">
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => {
          const r = record as { reportedUserId: string };
          return adminClickableRowTo(
            router,
            `/admin/profiles/edit/${r.reportedUserId}`,
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
          dataIndex="reportedName"
          title="Reported user"
          render={(name: string | null, r: { reportedUserId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/u/${r.reportedUserId}`}
              target="_blank"
              rel="noreferrer"
              onClick={stopAdminRowClick}
            >
              {name?.trim() || "Grower"}
            </Link>
          )}
        />
        <Table.Column dataIndex="reason" title="Reason" ellipsis />
        <Table.Column
          title="Profile visibility"
          width={120}
          render={(_: unknown, r: { reportedProfilePublic?: boolean }) =>
            r.reportedProfilePublic ? (
              <Tag color="blue">Public</Tag>
            ) : (
              <Tag>Private</Tag>
            )
          }
        />
        <Table.Column
          title="Reported bio / intro"
          width={320}
          render={(
            _: unknown,
            r: {
              reportedDescriptionPreview?: string | null;
              reportedDescriptionFull?: string | null;
            },
          ) => {
            const full = r.reportedDescriptionFull?.trim();
            if (!full) {
              return (
                <Typography.Text type="secondary" className="text-xs">
                  (empty)
                </Typography.Text>
              );
            }
            return (
              <Typography.Paragraph
                className="mb-0 max-h-40 overflow-y-auto text-xs"
                copyable={{ text: full }}
              >
                {full}
              </Typography.Paragraph>
            );
          }}
        />
        <Table.Column
          title="Profile"
          render={(_: unknown, r: { reportedUserId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/u/${r.reportedUserId}`}
              target="_blank"
              rel="noreferrer"
              onClick={stopAdminRowClick}
            >
              Open profile
            </Link>
          )}
        />
        <Table.Column
          title="Moderation"
          render={(_: unknown, r: { id: string }) => (
            <span onClick={stopAdminRowClick}>
              <Button size="small" onClick={() => setDismissReportId(r.id)}>
                No action / mark safe
              </Button>
            </span>
          )}
        />
      </Table>
      <AdminDismissReportModal
        open={dismissReportId !== null}
        title="Resolve profile report (no violation)"
        confirmLoading={dismissLoading}
        onCancel={() => setDismissReportId(null)}
        onFinish={(v) => void submitDismiss(v)}
      />
    </List>
  );
}
