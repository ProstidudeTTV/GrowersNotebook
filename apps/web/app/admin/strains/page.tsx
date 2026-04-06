"use client";

import { CreateButton, List, useTable } from "@refinedev/antd";
import { Button, Table } from "antd";
import Link from "next/link";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminStrainsPage() {
  const { tableProps, searchFormProps } = useTable({
    resource: "strains",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Strains (catalog)" headerButtons={<CreateButton />}>
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table {...tableProps} rowKey="id">
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
            <span className="flex flex-wrap gap-2">
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
                View
              </Link>
              <Link
                href={`/admin/strain-reviews?strainId=${record.id}`}
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                Reviews
              </Link>
            </span>
          )}
        />
      </Table>
    </List>
  );
}
