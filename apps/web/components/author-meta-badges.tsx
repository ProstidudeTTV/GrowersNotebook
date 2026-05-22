import { DEFAULT_GROWER_RANK } from "@/lib/grower-display";
import { StaffRoleBadge } from "@/components/staff-role-badge";

/** Grower tier + staff role pills beside author names in feeds and threads. */
export function AuthorMetaBadges({
  growerLevel,
  role,
  compact,
}: {
  growerLevel?: string | null;
  role?: string | null;
  compact?: boolean;
}) {
  const tier = growerLevel?.trim() || DEFAULT_GROWER_RANK;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex shrink-0 rounded-full bg-[var(--gn-accent)]/15 font-semibold text-[var(--gn-accent)] ${
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[10px]"
        }`}
        title="Grower tier"
      >
        {tier}
      </span>
      <StaffRoleBadge role={role} />
    </span>
  );
}
