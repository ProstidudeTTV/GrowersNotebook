"use client";

import { Modal } from "antd";

type Props = {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
};

/** Full text for moderation_warning notifications (site chrome, not admin). */
export function ModerationWarningModal({
  open,
  title,
  body,
  onClose,
}: Props) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={480}
    >
      <p className="whitespace-pre-wrap text-sm text-[var(--gn-text)]">{body}</p>
    </Modal>
  );
}
