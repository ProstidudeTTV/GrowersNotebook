"use client";

import "@ant-design/v5-patch-for-react-19";

import {
  BarChartOutlined,
  ExperimentOutlined,
  InboxOutlined,
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
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { GrowersAdminSider } from "./growers-admin-sider";

import { getPublicApiUrl } from "@/lib/public-api-url";

const API = getPublicApiUrl();

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

/** Refine + notifications must render under `<AntdApp>` so `App.useApp()` works. */
function RefineAdminShell({ children }: { children: React.ReactNode }) {
  const notificationProvider = useNotificationProvider();
  const dark = useSiteDarkMode();

  return (
    <ConfigProvider
      theme={{
        ...RefineThemes.Blue,
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider(`${API}/admin`, adminAxios)}
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
