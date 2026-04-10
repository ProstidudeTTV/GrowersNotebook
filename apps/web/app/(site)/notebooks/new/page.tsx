"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

/** Placeholder until the owner finishes step 1 of the setup wizard on the notebook page. */
const DRAFT_NOTEBOOK_TITLE = "New notebook";

export default function NewNotebookPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = async () => {
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
          title: DRAFT_NOTEBOOK_TITLE,
          strainId: null,
          customStrainLabel: null,
        }),
      });
      router.push(`/notebooks/${encodeURIComponent(id)}?setup=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-[var(--gn-text)]">
        Set up your notebook
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        We&apos;ll create your notebook and walk you through name, setup, and
        environment. After that, this page shows your summary and weekly entries;{" "}
        <strong className="font-medium text-[var(--gn-text)]">Add week</strong>{" "}
        opens the week-by-week log.
      </p>
      <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
        To tie your diary to a cultivar in the directory and on strain pages,
        use{" "}
        <strong className="font-medium text-[var(--gn-text)]">Details</strong>{" "}
        after setup and pick from the{" "}
        <Link
          href="/strains"
          className="font-medium text-[#ff4500] hover:underline"
        >
          Strains
        </Link>{" "}
        catalog (or keep a free-text label only).
      </p>
      <Link
        href="/notebooks"
        className="mt-4 inline-block text-sm text-[#ff4500] hover:underline"
      >
        ← All notebooks
      </Link>

      <div className="mt-8 space-y-4">
        {err ? (
          <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void start()}
          className="rounded-full bg-[#ff4500] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
