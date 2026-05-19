"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";

export function SiteProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
