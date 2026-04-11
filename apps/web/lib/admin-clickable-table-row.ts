import type { CSSProperties, MouseEvent } from "react";

type RouterWithPush = { push: (href: string) => void | Promise<void> };

/** Use on Ant Design <Table onRow={...} /> for same-tab navigation. Pair with `stopAdminRowClick` on links/buttons inside the row. */
export function adminClickableRowTo(
  router: RouterWithPush,
  href: string,
): {
  onClick: () => void;
  className: string;
  style: CSSProperties;
} {
  return {
    onClick: () => {
      void router.push(href);
    },
    className: "admin-table-row-clickable",
    style: { cursor: "pointer" },
  };
}

export function stopAdminRowClick(e: MouseEvent) {
  e.stopPropagation();
}
