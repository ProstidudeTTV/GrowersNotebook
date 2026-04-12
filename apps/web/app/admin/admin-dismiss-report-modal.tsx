"use client";

import { Form, Input, Modal, Switch } from "antd";
import { useEffect } from "react";

export type AdminDismissReportPayload = {
  reporterNote?: string;
  notifyReported: boolean;
  reportedWarning?: string;
};

type Props = {
  open: boolean;
  title: string;
  onCancel: () => void;
  onFinish: (v: AdminDismissReportPayload) => void;
  confirmLoading?: boolean;
};

export function AdminDismissReportModal({
  open,
  title,
  onCancel,
  onFinish,
  confirmLoading,
}: Props) {
  const [form] = Form.useForm<{ reporterNote?: string; notifyReported?: boolean; reportedWarning?: string }>();
  const notifyReported = Form.useWatch("notifyReported", form);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        reporterNote: "",
        notifyReported: false,
        reportedWarning: "",
      });
    }
  }, [open, form]);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText="Resolve report"
      onOk={() => form.submit()}
      destroyOnClose
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => {
          onFinish({
            reporterNote: v.reporterNote?.trim() || undefined,
            notifyReported: Boolean(v.notifyReported),
            reportedWarning: v.reportedWarning?.trim() || undefined,
          });
        }}
      >
        <Form.Item
          name="reporterNote"
          label="Message to reporter (optional)"
          extra="They always get a notification when you resolve. Leave blank to use a default “no action” summary."
        >
          <Input.TextArea
            rows={3}
            placeholder="Optional note about your decision…"
          />
        </Form.Item>
        <Form.Item
          name="notifyReported"
          label="Also notify the reported user"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        {notifyReported ? (
          <Form.Item
            name="reportedWarning"
            label="Warning message for reported user"
            rules={[
              {
                required: true,
                message: "Enter what they should know (shown in their notifications).",
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Explain the issue; they can open this from their notifications to read the full text."
            />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
