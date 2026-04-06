"use client";

import { EditButton, List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table, Tag } from "antd";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminProfilesPage() {
  const { tableProps, searchFormProps } = useTable({
    resource: "profiles",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Profiles">
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="User ID" ellipsis />
        <Table.Column dataIndex="displayName" title="Display name" />
        <Table.Column
          dataIndex="role"
          title="Role"
          render={(role: string) => <Tag>{role}</Tag>}
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
            <Space>
              <EditButton
                hideText
                size="small"
                recordItemId={record.id}
                resource="profiles"
              />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
