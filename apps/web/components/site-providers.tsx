"use client";

import type { ReactNode } from "react";
import {
  AuthProvider,
  type InitialAuthSession,
} from "@/components/auth-provider";

export function SiteProviders({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth?: InitialAuthSession;
}) {
  return <AuthProvider initial={initialAuth}>{children}</AuthProvider>;
}
