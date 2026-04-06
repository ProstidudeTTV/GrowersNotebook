"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminDisallowedNamesPage() {
  const { tableProps, searchFormProps } = useTable({
    resource: "disallowed-names",
    syncWithLocation: true,
    pagination: { pageSize: 50 },
  });

  return (
    <List title="Blocked name terms" headerButtons={<CreateButton />}>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="term" title="Blocked substring" />
        <Table.Column
          dataIndex="createdAt"
          title="Added"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column<{ id: string }>
          title="Actions"
          render={(_, record) => (
            <DeleteButton
              resource="disallowed-names"
              recordItemId={record.id}
              size="small"
            />
          )}
        />
      </Table>
    </List>
  );
}
