import { isStaffRole, staffRoleLabel } from "@/lib/staff-role";

/**
 * Pill shown beside grower tier on posts, comments, and profiles for site staff.
 */
export function StaffRoleBadge({ role }: { role?: string | null }) {
  const label = staffRoleLabel(role);
  if (!label || !isStaffRole(role)) return null;

  const tone =
    role === "moderator"
      ? "border-sky-500/35 bg-sky-500/15 text-sky-200"
      : "border-[color-mix(in_srgb,var(--gn-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--gn-accent)_18%,transparent)] text-[var(--gn-accent)]";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
      title="Growers Notebook staff"
    >
      {label}
    </span>
  );
}
