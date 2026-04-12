"use client";

import "@ant-design/v5-patch-for-react-19";
import "./admin-surface.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import {
  RefineThemes,
  ThemedLayout,
  ThemedTitle,
  useNotificationProvider,
} from "@refinedev/antd";
import type { NotificationProvider } from "@refinedev/core";
import { Refine } from "@refinedev/core";
import dataProvider from "@refinedev/simple-rest";
import routerProvider from "@refinedev/nextjs-router/app";
import { App as AntdApp, ConfigProvider, Spin, theme } from "antd";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ADMIN_PROXY_PATH, adminAxios } from "@/lib/admin-axios";
import { refineResourcesForStaffRole } from "./admin-refine-resources";
import { AdminStaffProvider, useAdminStaff } from "./admin-staff-context";
import { GrowersAdminSider } from "./growers-admin-sider";

function useSiteDarkMode() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const read = () => {
      const root = document.documentElement;
      const fromClass = root.classList.contains("dark");
      let fromStorage: "dark" | "light" | null = null;
      try {
        const s = localStorage.getItem("gn-theme");
        if (s === "light" || s === "dark") fromStorage = s;
      } catch {
        /* ignore */
      }
      setDark(
        fromStorage === "light"
          ? false
          : fromStorage === "dark"
            ? true
            : fromClass,
      );
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("storage", read);
    return () => {
      obs.disconnect();
      window.removeEventListener("storage", read);
    };
  }, []);
  return dark;
}

/**
 * Refine's simple-rest provider embeds `apiUrl` in request URLs. If that string is
 * built during SSR (`NEXT_PUBLIC_API_URL`), the browser keeps calling the API
 * host and hits CORS. Wait for the real origin, then point at the gn-proxy.
 */
function useBrowserAdminApiBase(): string | null {
  const [base, setBase] = useState<string | null>(null);
  useLayoutEffect(() => {
    setBase(`${window.location.origin}${ADMIN_PROXY_PATH}`);
  }, []);
  return base;
}

/** Refine + notifications must render under `<AntdApp>` so `App.useApp()` works. */
function RefineAdminShell({ children }: { children: React.ReactNode }) {
  const notificationProvider = useNotificationProvider();
  const dark = useSiteDarkMode();
  const adminApiBase = useBrowserAdminApiBase();
  const { role, loading: staffLoading } = useAdminStaff();
  const restDataProvider = useMemo(
    () => (adminApiBase ? dataProvider(adminApiBase, adminAxios) : null),
    [adminApiBase],
  );
  const resources = useMemo(
    () => (role ? refineResourcesForStaffRole(role) : []),
    [role],
  );

  return (
       <ConfigProvider
      theme={{
        ...RefineThemes.Blue,
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...RefineThemes.Blue.token,
          colorPrimary: dark ? "#ff6b35" : "#c2410c",
          borderRadiusLG: 12,
          fontFamily: `var(--font-geist-sans), system-ui, sans-serif`,
        },
      }}
    >
      {!restDataProvider || staffLoading || !role ? (
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <Spin size="large" />
        </div>
      ) : (
      <Refine
        routerProvider={routerProvider}
        dataProvider={restDataProvider}
        notificationProvider={notificationProvider as NotificationProvider}
        resources={resources}
        options={{ syncWithLocation: true }}
      >
        <ThemedLayout
          Sider={GrowersAdminSider}
          Title={({ collapsed }) => (
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href="/"
                className="text-[0.7rem] font-semibold text-[#ff6b35] hover:underline dark:text-[#ff8f5a]"
              >
                ← Back to site
              </Link>
              <ThemedTitle collapsed={collapsed} text="Growers Admin" />
            </div>
          )}
        >
          <div className="admin-refine-surface px-4 py-5 sm:px-6 md:py-7">
            {children}
          </div>
        </ThemedLayout>
      </Refine>
      )}
    </ConfigProvider>
  );
}

export function RefineAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AntdRegistry>
      <AntdApp>
        <AdminStaffProvider>
          <RefineAdminShell>{children}</RefineAdminShell>
        </AdminStaffProvider>
      </AntdApp>
    </AntdRegistry>
  );
}
