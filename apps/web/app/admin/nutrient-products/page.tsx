"use client";

import { CreateButton, List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminNutrientProductsPage() {
  const router = useRouter();
  const { tableProps, searchFormProps } = useTable({
    resource: "nutrient-products",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List
      title="Nutrient products"
      headerButtons={<CreateButton />}
    >
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () =>
            router.push(
              `/admin/nutrient-products/edit/${(record as { id: string }).id}`,
            ),
        })}
      >
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="brand" title="Brand" />
        <Table.Column dataIndex="npk" title="NPK" />
        <Table.Column
          dataIndex="published"
          title="Published"
          render={(v: boolean) => (v ? "Yes" : "No")}
        />
        <Table.Column<{ id: string }>
          title="Open"
          width={100}
          render={(_, record) => (
            <Link
              href={`/admin/nutrient-products/edit/${record.id}`}
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
