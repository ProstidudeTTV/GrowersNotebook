"use client";



import { Edit, useForm } from "@refinedev/antd";

import { Button, Form, Input } from "antd";

import { CommunityAppearanceFields } from "@/components/admin/community-appearance-fields";
import { CommunityModeratorsPanel } from "@/components/admin/community-moderators-panel";

import Link from "next/link";

import { useParams } from "next/navigation";



export default function AdminCommunityEditPage() {

  const params = useParams();

  const id = params.id as string;

  const { form, formProps, saveButtonProps } = useForm({

    resource: "communities",

    action: "edit",

  });



  const slug = Form.useWatch<string | undefined>("slug", form);



  return (

    <Edit

      footerButtons={() => null}

      saveButtonProps={saveButtonProps}

      headerButtons={() => (

        <Link href={`/admin/posts?communityId=${id}`}>

          <Button type="primary">Manage posts in this community</Button>

        </Link>

      )}

    >

      <Form {...formProps} form={form} layout="vertical">
        <Form.Item label="Slug" name="slug">
          <Input disabled />
        </Form.Item>
        <CommunityAppearanceFields form={form} communitySlug={slug} />

        <Form.Item className="!mt-8">

          <Button type="primary" htmlType="submit" {...saveButtonProps}>

            Save changes

          </Button>

        </Form.Item>

      </Form>

      <CommunityModeratorsPanel communityId={id} />
    </Edit>
  );
}

