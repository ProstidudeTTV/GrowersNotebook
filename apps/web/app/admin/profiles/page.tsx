"use client";

import { EditButton, List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table, Tag } from "antd";

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
import { useRouter } from "next/navigation";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminProfilesPage() {
  const router = useRouter();
  const { tableProps, searchFormProps } = useTable({
    resource: "profiles",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Profiles">
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
