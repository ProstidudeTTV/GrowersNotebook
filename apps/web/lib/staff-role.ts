/** Site staff roles (set on `profiles.role` in Supabase). */
export type StaffRole = "owner" | "admin" | "moderator";

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "owner" || role === "admin" || role === "moderator";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function staffRoleLabel(role: string | null | undefined): string | null {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Mod";
  return null;
}
