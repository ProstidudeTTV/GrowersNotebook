import {
  BarChartOutlined,
  BookOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  InboxOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  SettingOutlined,
  ShopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ResourceProps } from "@refinedev/core";

/** Full admin sidebar (super-admin + moderation). */
export const fullAdminResources: ResourceProps[] = [
  {
    name: "site-settings",
    list: "/admin/site-settings",
    meta: {
      label: "Site settings",
      icon: <SettingOutlined />,
    },
  },
  {
    name: "audit-events",
    list: "/admin/audit-log",
    meta: {
      label: "Audit log",
      icon: <FileTextOutlined />,
    },
  },
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
];

const MODERATOR_RESOURCE_NAMES = new Set([
  "profiles",
  "comment-reports",
  "profile-reports",
  "strains",
  "breeders",
  "catalog-suggestions",
  "strain-reviews",
  "breeder-reviews",
]);

export function refineResourcesForStaffRole(
  role: "admin" | "moderator",
): ResourceProps[] {
  if (role === "admin") return fullAdminResources;
  return fullAdminResources
    .filter((r) => MODERATOR_RESOURCE_NAMES.has(String(r.name)))
    .map((r) => {
      if (r.name === "strains") {
        return { ...r, create: undefined, edit: "/admin/strains/edit/:id" };
      }
      if (r.name === "breeders") {
        return { ...r, create: undefined, edit: undefined };
      }
      return r;
    });
}
