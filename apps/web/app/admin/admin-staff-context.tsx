"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { adminApiErrorMessage } from "@/lib/admin-api-error";
import { createClient } from "@/lib/supabase/client";

export type StaffRole = "admin" | "moderator";

export type InitialStaffSession = {
  userId: string;
  displayName: string | null;
  role: StaffRole;
};

type AdminStaffContextValue = {
  role: StaffRole | null;
  loading: boolean;
  isAdmin: boolean;
  userId: string | null;
  displayName: string | null;
  error: string | null;
  storageConfigured: boolean | null;
  canChangeRoles: boolean;
};

const AdminStaffContext = createContext<AdminStaffContextValue>({
  role: null,
  loading: true,
  isAdmin: false,
  userId: null,
  displayName: null,
  error: null,
  storageConfigured: null,
  canChangeRoles: false,
});

export function AdminStaffProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: InitialStaffSession;
}) {
  const [role, setRole] = useState<StaffRole | null>(initial?.role ?? null);
  const [userId, setUserId] = useState<string | null>(initial?.userId ?? null);
  const [displayName, setDisplayName] = useState<string | null>(
    initial?.displayName?.trim() || null,
  );
  const [error, setError] = useState<string | null>(null);
  const [storageConfigured, setStorageConfigured] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(!initial?.role);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!initial?.role) setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const sessionUserId = data.session?.user?.id ?? null;
        if (!token) {
          if (!cancelled) {
            setRole(null);
            setUserId(null);
            setDisplayName(null);
            setStorageConfigured(null);
            setError("Not signed in.");
            setLoading(false);
          }
          return;
        }
        if (!cancelled && sessionUserId) setUserId(sessionUserId);

        const res = await adminAxios.get<{
          id: string;
          role: string;
          displayName: string | null;
          isAdmin: boolean;
          storageConfigured?: boolean;
          canChangeRoles?: boolean;
        }>("/me");
        if (!cancelled) {
          setUserId(res.data.id);
          setDisplayName(res.data.displayName?.trim() || null);
          setStorageConfigured(res.data.storageConfigured ?? null);
          if (res.data.role === "admin" || res.data.role === "moderator") {
            setRole(res.data.role);
            setError(null);
          } else {
            setRole(null);
            setError(`Your account role is "${res.data.role}", not staff.`);
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          if (initial?.role) {
            setRole(initial.role);
            setUserId(initial.userId);
            setDisplayName(initial.displayName?.trim() || null);
            setError(
              `Live staff check failed (${adminApiErrorMessage(e, "API error")}). Using server-verified role.`,
            );
            setLoading(false);
          } else {
            setRole(null);
            setError(adminApiErrorMessage(e, "Could not verify staff session."));
            setLoading(false);
          }
        }
      }
    };

    void load();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) void load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [initial?.role, initial?.userId, initial?.displayName]);

  const isAdmin = role === "admin";

  return (
    <AdminStaffContext.Provider
      value={{
        role,
        loading,
        isAdmin,
        userId,
        displayName,
        error,
        storageConfigured,
        canChangeRoles: isAdmin,
      }}
    >
      {children}
    </AdminStaffContext.Provider>
  );
}

export function useAdminStaff() {
  return useContext(AdminStaffContext);
}
