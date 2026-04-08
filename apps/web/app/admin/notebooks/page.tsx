"use client";

import { CreateButton, List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminNotebooksPage() {
  const router = useRouter();
  const { tableProps, searchFormProps } = useTable({
    resource: "notebooks",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Notebooks (grow diaries)" headerButtons={<CreateButton />}>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () =>
            router.push(`/admin/notebooks/edit/${(record as { id: string }).id}`),
        })}
      >
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column
          dataIndex="ownerDisplayName"
          title="Owner"
          render={(v: string | null) => v ?? "—"}
        />
        <Table.Column dataIndex="status" title="Status" />
        <Table.Column
          dataIndex="updatedAt"
          title="Updated"
          render={(v: string) =>
            v ? new Date(v).toLocaleString(undefined, { dateStyle: "short" }) : "—"
          }
        />
        <Table.Column<{ id: string }>
          title="Open"
          width={100}
          render={(_, record) => (
            <Link
              href={`/admin/notebooks/edit/${record.id}`}
              className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </Link>
          )}
        />
      </Table>
    </List>
  );
}
