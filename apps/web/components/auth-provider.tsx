"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";

type MeProfile = {
  displayName: string | null;
  avatarUrl: string | null;
};

type AuthContextValue = {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  loading: boolean;
  profileLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  email: null,
  displayName: null,
  avatarUrl: null,
  loading: true,
  profileLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileFetchSeq = useRef(0);

  const applyProfile = useCallback(async (token: string | null | undefined) => {
    const seq = ++profileFetchSeq.current;
    if (!token) {
      setDisplayName(null);
      setAvatarUrl(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const me = await apiFetch<MeProfile>("/profiles/me", {
        token,
        timeoutMs: 12_000,
      });
      if (seq !== profileFetchSeq.current) return;
      setDisplayName(me.displayName?.trim() || null);
      setAvatarUrl(me.avatarUrl?.trim() || null);
    } catch {
      if (seq !== profileFetchSeq.current) return;
      setDisplayName(null);
      setAvatarUrl(null);
    } finally {
      if (seq === profileFetchSeq.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const sync = (
      session: {
        user: { id: string; email?: string | null };
        access_token?: string;
      } | null,
    ) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
      setLoading(false);
      void applyProfile(session?.access_token);
    };
    void supabase.auth.getSession().then(({ data: { session } }) => {
      sync(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session);
    });
    return () => subscription.unsubscribe();
  }, [applyProfile]);

  return (
    <AuthContext.Provider
      value={{
        userId,
        email,
        displayName,
        avatarUrl,
        loading,
        profileLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
