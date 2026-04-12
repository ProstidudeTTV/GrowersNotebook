"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPublicApiUrl } from "@/lib/public-api-url";

export type StaffRole = "admin" | "moderator";

type AdminStaffContextValue = {
  role: StaffRole | null;
  loading: boolean;
  isAdmin: boolean;
};

const AdminStaffContext = createContext<AdminStaffContextValue>({
  role: null,
  loading: true,
  isAdmin: false,
});

export function AdminStaffProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(`${getPublicApiUrl()}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const j = (await res.json()) as { role: string };
        if (!cancelled) {
          if (j.role === "admin" || j.role === "moderator") {
            setRole(j.role);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminStaffContext.Provider
      value={{ role, loading, isAdmin: role === "admin" }}
    >
      {children}
    </AdminStaffContext.Provider>
  );
}

export function useAdminStaff() {
  return useContext(AdminStaffContext);
}
