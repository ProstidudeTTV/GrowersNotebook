"use client";

import { CreateButton, DeleteButton, List, useTable } from "@refinedev/antd";
import { Avatar, Button, Form, Input, Table } from "antd";
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
    onSearch: (values: { q?: string }) =>
      values.q
        ? [{ field: "q", operator: "contains" as const, value: values.q }]
        : [],
  });

  return (
    <List
      title="Communities"
      headerButtons={<CreateButton />}
    >
      <Form
        {...(({ children: _c, ...rest }) => rest)(searchFormProps)}
        layout="inline"
        className="mb-4"
      >
        <Form.Item name="q" className="mb-0">
          <Input.Search
            placeholder="Search communities…"
            allowClear
            onSearch={() => searchFormProps.form?.submit()}
          />
        </Form.Item>
      </Form>
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
        <Table.Column<{ name: string; iconUrl?: string | null }>
          title=""
          width={48}
          render={(_, record) =>
            record.iconUrl ? (
              <Avatar src={record.iconUrl} size={32} alt={record.name} />
            ) : (
              <Avatar size={32} style={{ backgroundColor: "#ff6b35", fontWeight: 600 }}>
                {record.name.charAt(0).toUpperCase()}
              </Avatar>
            )
          }
        />
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
        <Table.Column<{ id: string; name: string; slug: string }>
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
              <a
                href={`/community/${record.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1677ff] hover:underline dark:text-[#69b1ff]"
              >
                View Public →
              </a>
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
