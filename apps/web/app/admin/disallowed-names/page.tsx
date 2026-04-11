"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Drawer, Table, Typography } from "antd";
import { useState } from "react";
import { stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

type TermRow = { id: string; term: string; createdAt: string };

export default function AdminDisallowedNamesPage() {
  const [drawerRow, setDrawerRow] = useState<TermRow | null>(null);
  const { tableProps, searchFormProps } = useTable({
    resource: "disallowed-names",
    syncWithLocation: true,
    pagination: { pageSize: 50 },
  });

  return (
    <List title="Blocked name terms" headerButtons={<CreateButton />}>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => setDrawerRow(record as TermRow),
          className: "admin-table-row-clickable",
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="term" title="Blocked substring" />
        <Table.Column
          dataIndex="createdAt"
          title="Added"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column<{ id: string }>
          title="Actions"
          render={(_, record) => (
            <span onClick={stopAdminRowClick}>
              <DeleteButton
                resource="disallowed-names"
                recordItemId={record.id}
                size="small"
              />
            </span>
          )}
        />
      </Table>
      <Drawer
        title="Blocked term"
        width={420}
        open={drawerRow !== null}
        onClose={() => setDrawerRow(null)}
        destroyOnClose
      >
        {drawerRow ? (
          <>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Typography.Text code copyable>
                {drawerRow.term}
              </Typography.Text>
            </Typography.Paragraph>
            <Typography.Text type="secondary">
              Added {new Date(drawerRow.createdAt).toLocaleString()}
            </Typography.Text>
            <div className="mt-6">
              <DeleteButton
                resource="disallowed-names"
                recordItemId={drawerRow.id}
                size="middle"
              />
            </div>
          </>
        ) : null}
      </Drawer>
    </List>
  );
}
