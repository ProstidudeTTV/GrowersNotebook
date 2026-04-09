"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type Suggestion = { id: string; name: string; slug: string };

export default function NewNotebookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [strainId, setStrainId] = useState<string | null>(null);
  const [customStrainLabel, setCustomStrainLabel] = useState("");
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await apiFetch<{ items: Suggestion[] }>(
            `/notebooks/strain-suggestions?q=${encodeURIComponent(t)}&pageSize=12`,
          );
          setSuggestions(res.items ?? []);
        } catch {
          setSuggestions([]);
        }
      })();
    }, 250);
    return () => window.clearTimeout(id);
  }, [q]);

  const pickStrain = useCallback((s: Suggestion) => {
    setStrainId(s.id);
    setCustomStrainLabel("");
    setQ(s.name);
    setSuggestions([]);
  }, []);

  const clearStrain = () => {
    setStrainId(null);
  };

  const submit = async () => {
    setErr(null);
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const { id } = await apiFetch<{ id: string }>("/notebooks", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: title.trim(),
          strainId,
          customStrainLabel: strainId
            ? null
            : customStrainLabel.trim() || null,
        }),
      });
      router.push(`/notebooks/${encodeURIComponent(id)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-[var(--gn-text)]">New notebook</h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Start a grow diary. You can add weekly logs after saving.
      </p>
      <Link
        href="/notebooks"
        className="mt-4 inline-block text-sm text-[#ff4500] hover:underline"
      >
        ← All notebooks
      </Link>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[var(--gn-text)]">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="gn-input mt-1 w-full"
            placeholder="e.g. Winter 2026 indoor"
          />
        </label>

        <div className="relative block">
          <span className="text-sm font-medium text-[var(--gn-text)]">
            Strain (catalog search or custom below)
          </span>
          <input
            value={q}
            onChange={(e) => {
              clearStrain();
              setQ(e.target.value);
            }}
            className="gn-input mt-1 w-full"
            placeholder="Search catalog by name…"
            autoComplete="off"
          />
          {strainId ? (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Linked to catalog strain.
            </p>
          ) : null}
          {suggestions.length > 0 ? (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-lg">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                    onClick={() => pickStrain(s)}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-[var(--gn-text)]">
            Custom strain name
          </span>
          <input
            value={customStrainLabel}
            onChange={(e) => {
              setStrainId(null);
              setCustomStrainLabel(e.target.value);
            }}
            className="gn-input mt-1 w-full"
            placeholder="If not using catalog match"
            disabled={!!strainId}
          />
        </label>

        {err ? (
          <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}

        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => void submit()}
          className="rounded-full bg-[#ff4500] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </main>
  );
}
