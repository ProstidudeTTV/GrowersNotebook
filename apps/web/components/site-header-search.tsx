"use client";

/** Site-wide search: public growers + posts only — not strains/breeders catalog. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { clientApiJson } from "@/lib/client-api";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type ProfileHit = {
  id: string;
  displayName: string | null;
  description: string | null;
};

type PostHit = {
  id: string;
  title: string;
  excerpt: string | null;
};

type ProfileSearchJson = { items: ProfileHit[] };
type PostSearchJson = { items: PostHit[] };

export function SiteHeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const listId = `${formId}-hits`;

  const [value, setValue] = useState("");
  const debounced = useDebouncedValue(value.trim(), 260);
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileHit[]>([]);
  const [posts, setPosts] = useState<PostHit[]>([]);
  const [loading, setLoading] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (pathname === "/search") {
      const params = new URLSearchParams(window.location.search);
      setValue(params.get("q")?.trim() ?? "");
    }
  }, [pathname]);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setProfiles([]);
      setPosts([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setOpen(true);
    setLoading(true);
    let token: string | null = null;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
    } catch {
      token = null;
    }
    const qs = new URLSearchParams({
      q,
      page: "1",
      pageSize: "6",
    });
    try {
      const [pRes, oRes] = await Promise.all([
        clientApiJson<ProfileSearchJson>(`/profiles/search?${qs}`, {
          token,
          signal: ctrl.signal,
        }),
        clientApiJson<PostSearchJson>(`/posts/search?${qs}`, {
          token,
          signal: ctrl.signal,
        }),
      ]);
      if (!ctrl.signal.aborted) {
        setProfiles(pRes.items ?? []);
        setPosts(oRes.items ?? []);
      }
    } catch {
      if (!ctrl.signal.aborted) {
        setProfiles([]);
        setPosts([]);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(debounced);
    return () => ctrlRef.current?.abort();
  }, [debounced, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const hasHits = profiles.length > 0 || posts.length > 0;
  const panelOpen = open && debounced.length >= 2;

  return (
    <div ref={rootRef} className="relative flex w-full max-w-md min-w-0 flex-col">
      <form
        id={formId}
        action="/search"
        method="get"
        role="search"
        className="flex w-full min-w-0 items-center gap-2"
        onSubmit={() => setOpen(false)}
      >
        <label htmlFor="gn-site-search" className="sr-only">
          Search growers and posts
        </label>
        <input
          ref={inputRef}
          id="gn-site-search"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search growers & posts…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (debounced.length >= 2 && (hasHits || loading)) setOpen(true);
          }}
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          className="min-w-0 flex-1 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-[#ff6a38] focus:outline-none focus:ring-1 focus:ring-[#ff6a38]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-[#ff6a38] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ff7d4c]"
        >
          Search
        </button>
      </form>
      {panelOpen ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(420px,70vh)] overflow-auto rounded-xl border border-[var(--gn-border)] bg-[var(--gn-menu-bg)] py-2 shadow-[var(--gn-shadow-lg)] backdrop-blur-md"
        >
          {loading && !hasHits ? (
            <p className="px-3 py-2 text-sm text-[var(--gn-text-muted)]">
              Searching…
            </p>
          ) : null}
          {profiles.length > 0 ? (
            <div className="px-2 pb-2">
              <p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
                Growers
              </p>
              <ul className="space-y-0.5">
                {profiles.map((p) => (
                  <li key={p.id} role="option">
                    <Link
                      href={`/u/${p.id}`}
                      className="block rounded-lg px-2 py-2 text-left transition hover:bg-[var(--gn-surface-hover)]"
                      onClick={() => setOpen(false)}
                    >
                      <span className="block text-sm font-medium text-[#ff6a38]">
                        {p.displayName?.trim() || "Grower"}
                      </span>
                      {p.description?.trim() ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--gn-text-muted)]">
                          {p.description.trim()}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {posts.length > 0 ? (
            <div className="px-2 pb-2">
              <p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
                Posts
              </p>
              <ul className="space-y-0.5">
                {posts.map((p) => (
                  <li key={p.id} role="option">
                    <Link
                      href={`/p/${p.id}`}
                      className="block rounded-lg px-2 py-2 text-left transition hover:bg-[var(--gn-surface-hover)]"
                      onClick={() => setOpen(false)}
                    >
                      <span className="block text-sm font-medium text-[var(--gn-text)]">
                        {p.title}
                      </span>
                      {p.excerpt?.trim() ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--gn-text-muted)]">
                          {p.excerpt.trim()}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!loading && !hasHits ? (
            <p className="px-3 py-2 text-sm text-[var(--gn-text-muted)]">
              No matches. Try full search.
            </p>
          ) : null}
          <div className="border-t border-[var(--gn-divide)] px-2 pt-2">
            <button
              type="button"
              className="w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-[#ff6a38] transition hover:bg-[var(--gn-surface-hover)]"
              onClick={() => {
                setOpen(false);
                router.push(
                  `/search?q=${encodeURIComponent(debounced)}`,
                );
              }}
            >
              View all results →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
