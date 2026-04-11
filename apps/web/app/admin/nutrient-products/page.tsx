"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminClickableRowTo, stopAdminRowClick } from "@/lib/admin-clickable-table-row";
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
        onRow={(record) =>
          adminClickableRowTo(
            router,
            `/admin/nutrient-products/edit/${(record as { id: string }).id}`,
          )
        }
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
          title="Actions"
          width={200}
          render={(_, record) => (
            <span className="flex flex-wrap gap-2" onClick={stopAdminRowClick}>
              <Link
                href={`/admin/nutrient-products/edit/${record.id}`}
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                Edit
              </Link>
              <DeleteButton
                resource="nutrient-products"
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
