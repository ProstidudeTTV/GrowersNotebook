"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Button, Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminStrainsPage() {
  const router = useRouter();
  const { tableProps, searchFormProps } = useTable({
    resource: "strains",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Strains (catalog)" headerButtons={<CreateButton />}>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) =>
          adminClickableRowTo(
            router,
            `/admin/strains/edit/${(record as { id: string }).id}`,
          )
        }
      >
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          dataIndex="published"
          title="Published"
          render={(v: boolean) => (v ? "Yes" : "No")}
        />
        <Table.Column
          dataIndex="avgRating"
          title="Avg"
          render={(v: string | null) => v ?? "—"}
        />
        <Table.Column dataIndex="reviewCount" title="Reviews" />
        <Table.Column<{ id: string; slug: string }>
          title="Actions"
          render={(_, record) => (
            <span className="flex flex-wrap gap-2" onClick={stopAdminRowClick}>
              <Link href={`/admin/strains/edit/${record.id}`}>
                <Button type="link" size="small">
                  Edit
                </Button>
              </Link>
              <Link
                href={`/strains/${encodeURIComponent(record.slug)}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                Public
              </Link>
              <Link
                href={`/admin/strain-reviews?strainId=${record.id}`}
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                Reviews
              </Link>
              <DeleteButton
                resource="strains"
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
