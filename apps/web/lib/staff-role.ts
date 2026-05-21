/** Site staff roles (set on `profiles.role` in Supabase). */
export type StaffRole = "owner" | "admin" | "moderator";

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "owner" || role === "admin" || role === "moderator";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
