"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";
import { createClient } from "@/lib/supabase/client";

export type StaffRole = "admin" | "moderator";

type AdminStaffContextValue = {
  role: StaffRole | null;
  loading: boolean;
  isAdmin: boolean;
  userId: string | null;
  displayName: string | null;
  error: string | null;
};

const AdminStaffContext = createContext<AdminStaffContextValue>({
  role: null,
  loading: true,
  isAdmin: false,
  userId: null,
  displayName: null,
  error: null,
});

export function AdminStaffProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
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
            setError("Not signed in.");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) setUserId(sessionUserId);

        const res = await adminAxios.get<{
          id: string;
          role: string;
          displayName: string | null;
          isAdmin: boolean;
        }>("/me");
        if (!cancelled) {
          setUserId(res.data.id);
          setDisplayName(res.data.displayName?.trim() || null);
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
          setRole(null);
          const msg =
            e instanceof Error
              ? e.message
              : "Could not verify staff session with the API.";
          setError(msg);
          setLoading(false);
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
  }, []);

  return (
    <AdminStaffContext.Provider
      value={{
        role,
        loading,
        isAdmin: role === "admin",
        userId,
        displayName,
        error,
      }}
    >
      {children}
    </AdminStaffContext.Provider>
  );
}

export function useAdminStaff() {
  return useContext(AdminStaffContext);
}
