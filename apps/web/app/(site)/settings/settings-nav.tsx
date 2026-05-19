"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function IconPerson() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2.5h-15Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconBan() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: <IconPerson /> },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: <IconBell />,
  },
  { href: "/settings/blocked", label: "Blocked users", icon: <IconBan /> },
];

export function SettingsNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Settings sections"
      className="
        flex w-full gap-1 overflow-x-auto rounded-2xl border border-[var(--gn-divide)]
        bg-[var(--gn-surface-raised)] p-1
        md:flex-col md:gap-0.5 md:overflow-visible md:p-2
      "
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--gn-surface-muted)] px-3 py-2 text-sm font-medium text-[var(--gn-text)]"
                : "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-[var(--gn-text-muted)] transition-colors hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
