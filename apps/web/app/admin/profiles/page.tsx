"use client";

import { EditButton, List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Select, Space, Table, Tag } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

function roleTag(role: string) {
  if (role === "admin")
    return (
      <Tag color="magenta" className="font-medium">
        Admin
      </Tag>
    );
  if (role === "moderator")
    return (
      <Tag color="geekblue" className="font-medium">
        Moderator
      </Tag>
    );
  return <Tag>Member</Tag>;
}

function statusBadge(record: BaseRecord) {
  const bannedAt = record.bannedAt as string | null | undefined;
  const suspendedAt = record.suspendedAt as string | null | undefined;
  const isBanned = record.isBanned as boolean | undefined;
  const isSuspended = record.isSuspended as boolean | undefined;

  if (bannedAt || isBanned) {
    return (
      <Tag color="red" className="font-medium">
        Banned
      </Tag>
    );
  }
  if (suspendedAt || isSuspended) {
    return (
      <Tag color="orange" className="font-medium">
        Suspended
      </Tag>
    );
  }
  return null;
}

export default function AdminProfilesPage() {
  const router = useRouter();
  const { tableProps, searchFormProps, setFilters, filters } = useTable({
    resource: "profiles",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  const roleFilterValue = (
    filters as Array<{ field: string; value: unknown }>
  ).find((f) => f.field === "role")?.value as string | undefined;

  return (
    <List title="Profiles">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          placeholder="Filter by role"
          allowClear
          style={{ width: 180 }}
          value={roleFilterValue}
          onChange={(val: string | undefined) => {
            setFilters(
              val
                ? [{ field: "role", operator: "eq" as const, value: val }]
                : [],
            );
          }}
        >
          <Select.Option value="admin">Admin</Select.Option>
          <Select.Option value="moderator">Moderator</Select.Option>
          <Select.Option value="member">Member</Select.Option>
        </Select>
      </div>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) =>
          adminClickableRowTo(
            router,
            `/admin/profiles/edit/${String((record as BaseRecord).id)}`,
          )
        }
      >
        <Table.Column dataIndex="id" title="User ID" ellipsis />
        <Table.Column dataIndex="displayName" title="Display name" />
        <Table.Column
          dataIndex="role"
          title="Role"
          render={(r: string) => roleTag(r)}
        />
        <Table.Column<BaseRecord>
          title="Status"
          render={(_, record) => statusBadge(record) ?? <Tag>Active</Tag>}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Created"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column<BaseRecord>
          title="Actions"
          key="actions"
          fixed="right"
          render={(_, record) => (
            <span onClick={stopAdminRowClick}>
              <Space>
                <a
                  href={`/u/${String(record.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
                  onClick={stopAdminRowClick}
                >
                  View Profile →
                </a>
                <EditButton
                  hideText
                  size="small"
                  recordItemId={record.id}
                  resource="profiles"
                />
              </Space>
            </span>
          )}
        />
      </Table>
    </List>
  );
}
