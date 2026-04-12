"use client";

import { List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Table, Typography } from "antd";
import Link from "next/link";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

const { Text } = Typography;

export default function AdminAuditLogPage() {
  const { tableProps, searchFormProps } = useTable({
    resource: "audit-events",
    syncWithLocation: true,
    pagination: { pageSize: 25 },
  });

  return (
    <List>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <p className="mb-4 text-sm text-[var(--gn-text-muted)]">
        Recent staff actions (moderation, profile updates, and related events).
        Filter by query params in the URL or extend this list later.
      </p>
      <Table
        {...tableProps}
        rowKey="id"
        scroll={{ x: true }}
        columns={[
          {
            title: "When",
            dataIndex: "createdAt",
            width: 180,
            render: (v: string) =>
              v ? new Date(v).toLocaleString(undefined, { hour12: true }) : "—",
          },
          {
            title: "Action",
            dataIndex: "action",
            ellipsis: true,
          },
          {
            title: "Actor",
            dataIndex: "actorProfileId",
            width: 120,
            render: (id: string | null) =>
              id ? (
                <Link
                  href={`/admin/profiles/edit/${encodeURIComponent(id)}`}
                  className="text-[#1677ff] hover:underline"
                >
                  <Text code className="text-xs">
                    {id.slice(0, 8)}…
                  </Text>
                </Link>
              ) : (
                "—"
              ),
          },
          {
            title: "Subject",
            dataIndex: "subjectProfileId",
            width: 120,
            render: (id: string | null) =>
              id ? (
                <Link
                  href={`/admin/profiles/edit/${encodeURIComponent(id)}`}
                  className="text-[#1677ff] hover:underline"
                >
                  <Text code className="text-xs">
                    {id.slice(0, 8)}…
                  </Text>
                </Link>
              ) : (
                "—"
              ),
          },
          {
            title: "Entity",
            key: "entity",
            render: (_: unknown, r: BaseRecord) => {
              const entityType = r.entityType as string | undefined;
              const entityId = r.entityId as string | undefined;
              return entityType || entityId
                ? `${entityType ?? ""}${entityId ? ` ${entityId.slice(0, 8)}…` : ""}`
                : "—";
            },
          },
        ]}
      />
    </List>
  );
}
