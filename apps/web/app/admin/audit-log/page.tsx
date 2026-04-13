"use client";

import { List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Table, Tooltip, Typography } from "antd";
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
        Recent staff actions. “What happened” is a short label; hover a row to see
        the raw request line. Actor and subject show display names when available.
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
            title: "What happened",
            dataIndex: "actionLabel",
            ellipsis: true,
            render: (label: string | undefined, r: BaseRecord) => {
              const raw = String(r.action ?? "");
              const text = label?.trim() || raw;
              return (
                <Tooltip title={raw || undefined}>
                  <span>{text}</span>
                </Tooltip>
              );
            },
          },
          {
            title: "Actor",
            dataIndex: "actorProfileId",
            width: 200,
            render: (id: string | null, r: BaseRecord) => {
              const name = r.actorDisplayName as string | null | undefined;
              if (!id) return "—";
              return (
                <Link
                  href={`/admin/profiles/edit/${encodeURIComponent(id)}`}
                  className="text-[#1677ff] hover:underline"
                >
                  {name?.trim() ? (
                    <span className="font-medium">{name}</span>
                  ) : (
                    <Text type="secondary" className="text-xs">
                      (no name)
                    </Text>
                  )}
                  <Text code className="ml-1 text-[0.65rem]">
                    {id.slice(0, 8)}…
                  </Text>
                </Link>
              );
            },
          },
          {
            title: "Subject",
            dataIndex: "subjectProfileId",
            width: 200,
            render: (id: string | null, r: BaseRecord) => {
              const name = r.subjectDisplayName as string | null | undefined;
              if (!id) return "—";
              return (
                <Link
                  href={`/admin/profiles/edit/${encodeURIComponent(id)}`}
                  className="text-[#1677ff] hover:underline"
                >
                  {name?.trim() ? (
                    <span className="font-medium">{name}</span>
                  ) : (
                    <Text type="secondary" className="text-xs">
                      (no name)
                    </Text>
                  )}
                  <Text code className="ml-1 text-[0.65rem]">
                    {id.slice(0, 8)}…
                  </Text>
                </Link>
              );
            },
          },
          {
            title: "Entity",
            key: "entity",
            width: 160,
            render: (_: unknown, r: BaseRecord) => {
              const entityTypeLabel = r.entityTypeLabel as string | undefined;
              const entityId = r.entityId as string | undefined;
              if (!entityTypeLabel && !entityId) return "—";
              return (
                <span>
                  {entityTypeLabel ?? "—"}
                  {entityId ? (
                    <Tooltip title={entityId}>
                      <Text code className="ml-1 text-[0.65rem]">
                        {entityId.slice(0, 8)}…
                      </Text>
                    </Tooltip>
                  ) : null}
                </span>
              );
            },
          },
        ]}
      />
    </List>
  );
}
