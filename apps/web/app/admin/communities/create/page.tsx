"use client";

import { Create, useForm } from "@refinedev/antd";
import { Button, Form } from "antd";
import { CommunityAppearanceFields } from "@/components/admin/community-appearance-fields";

export default function AdminCommunityCreatePage() {
  const { form, formProps, saveButtonProps } = useForm({
    resource: "communities",
    action: "create",
  });

  const slug = Form.useWatch<string | undefined>("slug", form);

  return (
    <Create footerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form {...formProps} form={form} layout="vertical">
        <CommunityAppearanceFields
          form={form}
          communitySlug={slug}
          showSlugField
        />
        <Form.Item className="!mt-8">
          <Button type="primary" htmlType="submit" {...saveButtonProps}>
            Create community
          </Button>
        </Form.Item>
      </Form>
    </Create>
  );
}
