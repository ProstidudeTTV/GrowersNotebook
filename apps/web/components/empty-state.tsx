import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]/50 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-surface-elevated)] text-2xl text-[var(--gn-accent)]">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-[var(--gn-text)]">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--gn-text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] transition hover:brightness-110"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
