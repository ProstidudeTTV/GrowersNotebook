"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) {
            setRole(null);
            setLoading(false);
          }
          return;
        }
        /** Same-origin proxy — direct `NEXT_PUBLIC_API_URL` hits CORS in the browser. */
        const res = await fetch(
          `${window.location.origin}/api/gn-proxy/profiles/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!res.ok) {
          if (!cancelled) {
            setRole(null);
            setLoading(false);
          }
          return;
        }
        const j = (await res.json()) as { role: string };
        if (!cancelled) {
          if (j.role === "admin" || j.role === "moderator") {
            setRole(j.role);
          } else {
            setRole(null);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRole(null);
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
      value={{ role, loading, isAdmin: role === "admin" }}
    >
      {children}
    </AdminStaffContext.Provider>
  );
}

export function useAdminStaff() {
  return useContext(AdminStaffContext);
}
