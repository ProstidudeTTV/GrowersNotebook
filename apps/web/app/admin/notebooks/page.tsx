"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminNotebooksPage() {
  const router = useRouter();
  const { tableProps, searchFormProps } = useTable({
    resource: "notebooks",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Notebooks" headerButtons={<CreateButton />}>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) =>
          adminClickableRowTo(
            router,
            `/admin/notebooks/edit/${(record as { id: string }).id}`,
          )
        }
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
          title="Actions"
          width={200}
          render={(_, record) => (
            <span className="flex flex-wrap gap-2" onClick={stopAdminRowClick}>
              <Link
                href={`/admin/notebooks/edit/${record.id}`}
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                Edit
              </Link>
              <DeleteButton
                resource="notebooks"
                recordItemId={record.id}
                size="small"
              />
            </span>
          )}
        />
      </Table>
    </List>
  );
}
