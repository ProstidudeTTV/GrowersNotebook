"use client";

import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import Link from "next/link";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminProfileReportsPage() {
  const { tableProps, searchFormProps } = useTable({
    resource: "profile-reports",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Profile reports">
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="createdAt"
          title="Reported"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column dataIndex="reporterName" title="Reporter" />
        <Table.Column
          dataIndex="reportedName"
          title="Reported user"
          render={(name: string | null, r: { reportedUserId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/u/${r.reportedUserId}`}
              target="_blank"
              rel="noreferrer"
            >
              {name?.trim() || "Grower"}
            </Link>
          )}
        />
        <Table.Column dataIndex="reason" title="Reason" ellipsis />
        <Table.Column
          title="Profile"
          render={(_: unknown, r: { reportedUserId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/u/${r.reportedUserId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open profile
            </Link>
          )}
        />
      </Table>
    </List>
  );
}
