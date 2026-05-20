"use client";

import { Alert, Spin } from "antd";
import Link from "next/link";
import { useAdminStaff } from "@/app/admin/admin-staff-context";

export function AdminStaffStatusBar() {
  const { loading, role, displayName, userId, error } = useAdminStaff();

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-neutral-400">
        <Spin size="small" /> Verifying staff session…
      </div>
    );
  }

  if (error || !role) {
    return (
      <Alert
        type="error"
        showIcon
        className="mb-4"
        message="Staff session could not be verified"
        description={
          <>
            {error ?? "Your account is not recognized as admin or moderator."}{" "}
            <Link href="/login?next=/admin" className="font-semibold underline">
              Sign in again
            </Link>{" "}
            or return to the{" "}
            <Link href="/" className="font-semibold underline">
              main site
            </Link>
            .
          </>
        }
      />
    );
  }

  const roleLabel = role === "admin" ? "Site admin" : "Moderator";
  const name = displayName?.trim() || "Staff";

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#303030] bg-[#141414] px-4 py-2.5 text-sm">
      <span className="text-neutral-300">
        Signed in as{" "}
        <strong className="text-neutral-100">{name}</strong>
        <span className="mx-2 text-neutral-600">·</span>
        <span className="font-semibold text-[#4ade80]">{roleLabel}</span>
      </span>
      {userId ? (
        <Link
          href={`/u/${userId}`}
          className="text-[#4ade80] hover:underline"
        >
          View your profile →
        </Link>
      ) : null}
    </div>
  );
}
