"use client";

import { Create, useForm } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App as AntdApp, Button, Divider, Form, Input, Typography } from "antd";
import { useState } from "react";
import { adminAxios } from "@/lib/admin-axios";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

export default function AdminDisallowedNamesCreatePage() {
  const { message } = AntdApp.useApp();
  const invalidate = useInvalidate();
  const [bulkRaw, setBulkRaw] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const { form, formProps, saveButtonProps } = useForm({
    resource: "disallowed-names",
    action: "create",
  });

  const submitBulk = async () => {
    const raw = bulkRaw.trim();
    if (!raw) {
      message.warning("Enter at least one term, separated by commas.");
      return;
    }
    setBulkLoading(true);
    try {
      const { data } = await adminAxios.post<{
        created: number;
        skippedDuplicate: number;
        skippedInvalid: number;
      }>("disallowed-names/bulk", { raw });
      message.success(
        `Added ${data.created}. Skipped ${data.skippedDuplicate} already in list, ${data.skippedInvalid} invalid (over 120 characters).`,
      );
      setBulkRaw("");
      await invalidate({
        resource: "disallowed-names",
        invalidates: ["list"],
      });
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const m = ax.response?.data?.message;
      const detail = Array.isArray(m) ? m.join(", ") : m;
      message.error(detail || ax.message || "Bulk add failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Create footerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form {...formProps} form={form} layout="vertical">
        <Form.Item
          label="Blocked substring"
          name="term"
          rules={[{ required: true, min: 1, max: 120 }]}
          extra="Case-insensitive. If this text appears anywhere in a member display name or community name, the name is rejected. Add specific variants if users bypass with spelling tricks."
        >
          <Input placeholder="Term to block" autoComplete="off" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" {...saveButtonProps}>
            Add term
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <Paragraph strong>Bulk add</Paragraph>
      <Paragraph type="secondary" className="!mb-3">
        Enter many terms separated by commas. Spacing around commas is fine; each
        term is trimmed and lowercased. Duplicates in your paste or already in the
        list are skipped. Each term must be 120 characters or fewer.
      </Paragraph>
      <TextArea
        value={bulkRaw}
        onChange={(e) => setBulkRaw(e.target.value)}
        rows={8}
        placeholder="term-one, term-two, another-term"
        className="font-mono text-sm"
      />
      <div className="mt-3">
        <Button type="default" loading={bulkLoading} onClick={() => void submitBulk()}>
          Add all terms
        </Button>
      </div>
      {bulkRaw.trim() ? (
        <Text type="secondary" className="mt-2 block text-sm">
          Preview count (after split and dedupe):{" "}
          <Text strong>
            {
              [
                ...new Set(
                  bulkRaw
                    .split(",")
                    .map((p) => p.normalize("NFKC").trim().toLowerCase())
                    .filter((t) => t.length > 0 && t.length <= 120),
                ),
              ].length
            }
          </Text>
        </Text>
      ) : null}
    </Create>
  );
}
