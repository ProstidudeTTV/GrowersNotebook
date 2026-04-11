"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Button, Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminCommunitiesPage() {
  const router = useRouter();
  const { tableProps, searchFormProps } = useTable({
    resource: "communities",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List
      title="Communities"
      headerButtons={<CreateButton />}
    >
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) =>
          adminClickableRowTo(
            router,
            `/admin/communities/edit/${(record as { id: string }).id}`,
          )
        }
      >
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          dataIndex="description"
          title="Description"
          ellipsis
          render={(v: string | null) => v ?? "—"}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Created"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column<{ id: string; name: string }>
          title="Actions"
          render={(_, record) => (
            <span
              className="flex flex-wrap items-center gap-2"
              onClick={stopAdminRowClick}
            >
              <Link href={`/admin/communities/edit/${record.id}`}>
                <Button type="link" size="small">
                  Edit
                </Button>
              </Link>
              <Link
                href={`/admin/posts?communityId=${record.id}`}
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                Posts
              </Link>
              <DeleteButton
                resource="communities"
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
