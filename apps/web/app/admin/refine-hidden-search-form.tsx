"use client";

import { Form } from "antd";
import type { FormProps } from "antd";

/** Refine's `searchFormProps` can include a `children` render prop that conflicts with Ant Design Form + React 19 typings. */
export function RefineHiddenSearchForm({
  searchFormProps,
}: {
  searchFormProps: FormProps & { children?: unknown };
}) {
  const { children: _refineChild, ...rest } = searchFormProps;
  void _refineChild;
  return <Form {...rest} className="hidden" aria-hidden />;
}
