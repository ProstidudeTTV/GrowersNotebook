"use client";

import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import Link from "next/link";
import { RefineHiddenSearchForm } from "../refine-hidden-search-form";

export default function AdminCommentReportsPage() {
  const { tableProps, searchFormProps } = useTable({
    resource: "comment-reports",
    syncWithLocation: true,
    pagination: { pageSize: 20 },
  });

  return (
    <List title="Comment reports">
      <RefineHiddenSearchForm searchFormProps={searchFormProps} />
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="createdAt"
          title="Reported"
          render={(v: string) => new Date(v).toLocaleString()}
        />
        <Table.Column dataIndex="reporterName" title="Reporter" />
        <Table.Column
          dataIndex="postTitle"
          title="Post"
          render={(title: string, r: { postId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/p/${r.postId}`}
              target="_blank"
              rel="noreferrer"
            >
              {title}
            </Link>
          )}
        />
        <Table.Column
          dataIndex="commentPreview"
          title="Comment preview"
          ellipsis
        />
        <Table.Column dataIndex="reason" title="Reason" ellipsis />
        <Table.Column
          title="Context"
          render={(_: unknown, r: { postId: string; commentId: string }) => (
            <Link
              className="text-[#1677ff]"
              href={`/p/${r.postId}#comment-${r.commentId}`}
              target="_blank"
              rel="noreferrer"
            >
              View thread
            </Link>
          )}
        />
      </Table>
    </List>
  );
}
