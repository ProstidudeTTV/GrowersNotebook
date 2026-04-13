"use client";

import {
  BarsOutlined,
  LeftOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Drawer, Grid, Layout, Menu, theme } from "antd";
import {
  ThemedTitle,
  useThemedLayoutContext,
  type RefineThemedLayoutSiderProps,
} from "@refinedev/antd";
import { useLink, useMenu } from "@refinedev/core";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo } from "react";

const drawerButtonStyles: CSSProperties = {
  borderStartStartRadius: 0,
  borderEndStartRadius: 0,
  position: "fixed",
  top: 64,
  zIndex: 999,
};

type MenuTreeItem = {
  key: string;
  name: string;
  /** Raw list path from resource definition */
  list?: string;
  /** Resolved path from Refine `useMenu` (prefer this when set) */
  route?: string;
  label?: ReactNode;
  meta?: {
    label?: ReactNode;
    icon?: ReactNode;
    parent?: string;
  };
  children: MenuTreeItem[];
};

export function GrowersAdminSider({
  Title: TitleFromProps,
}: RefineThemedLayoutSiderProps) {
  const { token } = theme.useToken();
  const Link = useLink();
  const {
    siderCollapsed,
    setSiderCollapsed,
    mobileSiderOpen,
    setMobileSiderOpen,
  } = useThemedLayoutContext();
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const breakpoint = Grid.useBreakpoint();
  const isMobile =
    typeof breakpoint.lg === "undefined" ? false : !breakpoint.lg;
  const RenderToTitle = TitleFromProps ?? ThemedTitle;

  const buildItems = useCallback(
    (tree: MenuTreeItem[]): MenuProps["items"] =>
      tree.map((item) => {
        const labelBase = item.label ?? item.meta?.label ?? item.name;
        const icon = item.meta?.icon ?? <UnorderedListOutlined />;
        if (item.children.length > 0) {
          return {
            key: item.key,
            icon,
            label: labelBase,
            children: buildItems(item.children),
          };
        }
        const href = item.route ?? item.list ?? "";
        return {
          key: item.key,
          icon,
          label:
            href.length > 0 ? (
              <Link to={href}>{labelBase}</Link>
            ) : (
              labelBase
            ),
        };
      }),
    [Link],
  );

  const items = useMemo(
    () => buildItems(menuItems as MenuTreeItem[]),
    [menuItems, buildItems],
  );

  const menuNode = (
    <Menu
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      defaultOpenKeys={[...defaultOpenKeys]}
      style={{
        paddingTop: 8,
        border: "none",
        overflow: "auto",
        height: "calc(100% - 72px)",
      }}
      items={items}
      onClick={() => setMobileSiderOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <>
        <Drawer
          open={mobileSiderOpen}
          onClose={() => setMobileSiderOpen(false)}
          placement="left"
          closable={false}
          width={200}
          styles={{ body: { padding: 0 } }}
          maskClosable
        >
          <Layout>
            <Layout.Sider
              style={{
                height: "100vh",
                backgroundColor: token.colorBgContainer,
                borderRight: `1px solid ${token.colorBgElevated}`,
              }}
              width={200}
              collapsedWidth={200}
              collapsed={false}
            >
              <div
                style={{
                  width: 200,
                  padding: "0 16px",
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  height: 64,
                  backgroundColor: token.colorBgElevated,
                }}
              >
                <RenderToTitle collapsed={false} />
              </div>
              {menuNode}
            </Layout.Sider>
          </Layout>
        </Drawer>
        <Button
          style={drawerButtonStyles}
          size="large"
          onClick={() => setMobileSiderOpen(true)}
          icon={<BarsOutlined />}
        />
      </>
    );
  }

  const renderClosingIcons = () => {
    const iconProps = { style: { color: token.colorPrimary } };
    const OpenIcon = LeftOutlined;
    const CollapsedIcon = RightOutlined;
    const IconComponent = siderCollapsed ? CollapsedIcon : OpenIcon;
    return <IconComponent {...iconProps} />;
  };

  const siderStyles: CSSProperties = {
    backgroundColor: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBgElevated}`,
  };

  return (
    <Layout.Sider
        style={siderStyles}
        collapsible
        collapsed={siderCollapsed}
        onCollapse={(collapsed, type) => {
          if (type === "clickTrigger") {
            setSiderCollapsed(collapsed);
          }
        }}
        collapsedWidth={80}
        breakpoint="lg"
        trigger={
          <Button
            type="text"
            style={{
              borderRadius: 0,
              height: "100%",
              width: "100%",
              backgroundColor: token.colorBgElevated,
            }}
          >
            {renderClosingIcons()}
          </Button>
        }
      >
        <div
          style={{
            width: siderCollapsed ? 80 : 200,
            padding: siderCollapsed ? 0 : "0 16px",
            display: "flex",
            justifyContent: siderCollapsed ? "center" : "flex-start",
            alignItems: "center",
            height: 64,
            backgroundColor: token.colorBgElevated,
            fontSize: 14,
          }}
        >
          <RenderToTitle collapsed={siderCollapsed} />
        </div>
        {menuNode}
      </Layout.Sider>
  );
}
