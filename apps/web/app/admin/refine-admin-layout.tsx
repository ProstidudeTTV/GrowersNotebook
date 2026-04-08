"use client";

import "@ant-design/v5-patch-for-react-19";

import {
  BarChartOutlined,
  BookOutlined,
  ExperimentOutlined,
  InboxOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  ShopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
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
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ADMIN_PROXY_PATH, adminAxios } from "@/lib/admin-axios";
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
  const restDataProvider = useMemo(
    () => (adminApiBase ? dataProvider(adminApiBase, adminAxios) : null),
    [adminApiBase],
  );

  return (
    <ConfigProvider
      theme={{
        ...RefineThemes.Blue,
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      {!restDataProvider ? (
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <Spin size="large" />
        </div>
      ) : (
      <Refine
        routerProvider={routerProvider}
        dataProvider={restDataProvider}
        notificationProvider={notificationProvider as NotificationProvider}
        resources={[
          {
            name: "analytics",
            list: "/admin/analytics",
            meta: { label: "Site analytics", icon: <BarChartOutlined /> },
          },
          {
            name: "posts",
            list: "/admin/posts",
            meta: { label: "Posts" },
          },
          {
            name: "notebooks",
            list: "/admin/notebooks",
            create: "/admin/notebooks/create",
            edit: "/admin/notebooks/edit/:id",
            meta: { label: "Notebooks", icon: <BookOutlined /> },
          },
          {
            name: "nutrient-products",
            list: "/admin/nutrient-products",
            create: "/admin/nutrient-products/create",
            edit: "/admin/nutrient-products/edit/:id",
            meta: { label: "Nutrient products", icon: <MedicineBoxOutlined /> },
          },
          {
            name: "communities",
            list: "/admin/communities",
            create: "/admin/communities/create",
            edit: "/admin/communities/edit/:id",
            meta: { label: "Communities" },
          },
          {
            name: "profiles",
            list: "/admin/profiles",
            edit: "/admin/profiles/edit/:id",
            meta: { label: "Profiles" },
          },
          {
            name: "comment-reports",
            list: "/admin/comment-reports",
            meta: { label: "Comment reports" },
          },
          {
            name: "profile-reports",
            list: "/admin/profile-reports",
            meta: { label: "Profile reports" },
          },
          {
            name: "disallowed-names",
            list: "/admin/disallowed-names",
            create: "/admin/disallowed-names/create",
            meta: { label: "Blocked names" },
          },
          {
            name: "strains",
            list: "/admin/strains",
            create: "/admin/strains/create",
            edit: "/admin/strains/edit/:id",
            meta: {
              label: "Strains",
              parent: "catalog",
              icon: <ExperimentOutlined />,
            },
          },
          {
            name: "breeders",
            list: "/admin/breeders",
            create: "/admin/breeders/create",
            edit: "/admin/breeders/edit/:id",
            meta: {
              label: "Breeders",
              parent: "catalog",
              icon: <ShopOutlined />,
            },
          },
          {
            name: "catalog-import",
            list: "/admin/catalog-import",
            meta: {
              label: "Catalog CSV import",
              parent: "catalog",
              icon: <UploadOutlined />,
            },
          },
          {
            name: "catalog-suggestions",
            list: "/admin/catalog-suggestions",
            show: "/admin/catalog-suggestions/review/:id",
            meta: {
              label: "Catalog suggestions inbox",
              parent: "catalog-inbox",
              icon: <InboxOutlined />,
            },
          },
          {
            name: "strain-reviews",
            list: "/admin/strain-reviews",
            meta: {
              label: "Strain reviews",
              parent: "catalog-moderation",
              icon: <MessageOutlined />,
            },
          },
          {
            name: "breeder-reviews",
            list: "/admin/breeder-reviews",
            meta: {
              label: "Breeder reviews",
              parent: "catalog-moderation",
              icon: <MessageOutlined />,
            },
          },
        ]}
        options={{ syncWithLocation: true }}
      >
        <ThemedLayout
          Sider={GrowersAdminSider}
          Title={({ collapsed }) => (
            <ThemedTitle collapsed={collapsed} text="Growers Admin" />
          )}
        >
          {children}
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
        <RefineAdminShell>{children}</RefineAdminShell>
      </AntdApp>
    </AntdRegistry>
  );
}
