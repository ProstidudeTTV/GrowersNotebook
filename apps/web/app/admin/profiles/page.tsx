"use client";

import { EditButton, List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import {
  Avatar,
  Button,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminClickableRowTo,
  stopAdminRowClick,
} from "@/lib/admin-clickable-table-row";
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
  const suspendedUntil = record.suspendedUntil as string | null | undefined;
  const isBanned = record.isBanned as boolean | undefined;
  const isSuspended = record.isSuspended as boolean | undefined;

  if (bannedAt || isBanned) {
    return (
      <Tag color="red" className="font-medium">
        Banned
      </Tag>
    );
  }
  if (suspendedUntil || isSuspended) {
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
    onSearch: (values: { q?: string }) =>
      values.q
        ? [{ field: "q", operator: "contains" as const, value: values.q }]
        : [],
  });

  const roleFilterValue = (
    filters as Array<{ field: string; value: unknown }>
  ).find((f) => f.field === "role")?.value as string | undefined;

  return (
    <List title="Profiles">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Form
          {...(({ children: _c, ...rest }) => rest)(searchFormProps)}
          layout="inline"
          className="mb-0 flex flex-wrap items-end gap-3"
        >
          <Form.Item name="q" label="Search" className="mb-0 min-w-[14rem]">
            <Input.Search
              placeholder="Name or profile ID…"
              allowClear
              onSearch={() => searchFormProps.form?.submit()}
            />
          </Form.Item>
        </Form>
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
        <Table.Column<BaseRecord>
          title=""
          width={48}
          render={(_, record) => {
            const avatarUrl = record.avatarUrl as string | null | undefined;
            const name = String(record.displayName ?? record.id ?? "?");
            return avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <Avatar size={32} style={{ backgroundColor: "#15803d", fontWeight: 600 }}>
                {name.charAt(0).toUpperCase()}
              </Avatar>
            );
          }}
        />
        <Table.Column<BaseRecord>
          title="User"
          render={(_, record) => (
            <div>
              <p className="font-medium leading-tight">
                {String(record.displayName ?? "—")}
              </p>
              <Tooltip title="Click to copy ID">
                <code
                  className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigator.clipboard
                      .writeText(String(record.id))
                      .then(() => void message.success("ID copied"));
                  }}
                >
                  {String(record.id).slice(0, 8)}…
                </code>
              </Tooltip>
            </div>
          )}
        />
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
                  View →
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
