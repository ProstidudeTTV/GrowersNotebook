"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin/client";

type CheckEntry = {
  label: string;
  status: number;
  message: string;
  ok: boolean;
  source?: string;
};

export function AdminHealthClient({
  storageConfigured,
}: {
  storageConfigured: boolean | null;
}) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckEntry[] | null>(null);

  const runBrowserChecks = async () => {
    setRunning(true);
    try {
      const out: CheckEntry[] = [];

      const me = await adminFetch<{ id: string; role: string; storageConfigured: boolean }>("/me");
      out.push({
        label: "Browser → /api/gn-proxy/admin/me (auth + proxy)",
        status: me.status,
        ok: me.ok,
        message: me.ok ? `role=${me.data.role}, storage=${me.data.storageConfigured}` : me.message,
        source: me.ok ? "" : me.source,
      });

      const stats = await adminFetch<{ openPostReports: number }>("/moderation-stats");
      out.push({
        label: "Browser → /api/gn-proxy/admin/moderation-stats",
        status: stats.status,
        ok: stats.ok,
        message: stats.ok ? `openPostReports=${stats.data.openPostReports}` : stats.message,
        source: stats.ok ? "" : stats.source,
      });

      const reports = await adminFetch<unknown[]>("/comment-reports", {
        query: { _start: 0, _end: 5 },
      });
      out.push({
        label: "Browser → comment-reports list",
        status: reports.status,
        ok: reports.ok,
        message: reports.ok
          ? `${Array.isArray(reports.data) ? reports.data.length : 0} rows, totalCount=${reports.totalCount ?? "?"}`
          : reports.message,
        source: reports.ok ? "" : reports.source,
      });

      setResults(out);
    } finally {
      setRunning(false);
    }
  };

  const testUpload = async () => {
    setRunning(true);
    try {
      const png = makeTestPng();
      const form = new FormData();
      form.append("file", png, "health-check.png");
      form.append("slug", "health-check-do-not-exist");
      form.append("kind", "banner");

      const res = await adminFetch<{ url: string }>("/communities/upload-image", {
        method: "POST",
        form,
      });

      const entry: CheckEntry = res.ok
        ? {
            label: "POST community image (real upload test)",
            status: res.status,
            ok: true,
            message: `Uploaded: ${res.data.url}`,
          }
        : {
            label: "POST community image (real upload test)",
            status: res.status,
            ok: false,
            message: res.message,
            source: res.source,
          };

      setResults((prev) => [entry, ...(prev ?? [])]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] p-5">
      <h2 className="mb-3 text-lg font-bold">Browser-side tests</h2>
      <p className="mb-4 text-sm text-[var(--gn-text-muted)]">
        Hits the same paths the admin pages use (through <code>/api/gn-proxy/admin/*</code>) with
        your real session token. Confirms the proxy + auth + API chain works in this exact tab.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void runBrowserChecks()}
          disabled={running}
          className="rounded-xl bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {running ? "Running…" : "Run browser checks"}
        </button>
        <button
          type="button"
          onClick={() => void testUpload()}
          disabled={running || storageConfigured === false}
          className="rounded-xl border border-[var(--gn-ring)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] disabled:opacity-50"
          title={storageConfigured === false ? "API storage not configured — would fail" : ""}
        >
          {running ? "Running…" : "Test community image upload"}
        </button>
      </div>
      {storageConfigured === false ? (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <code>/admin/me</code> reports the API has no service-role storage configured. Upload
          test will return 503. Set <code>SUPABASE_URL</code> +{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> on the API service.
        </p>
      ) : null}

      {results ? (
        <ul className="mt-4 divide-y divide-[var(--gn-ring)]">
          {results.map((r, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span className="font-mono text-xs">{r.label}</span>
              <span
                className={`flex-shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold ${
                  r.ok
                    ? "bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {r.status || "ERR"}
                {r.source ? ` · ${r.source}` : ""}
              </span>
              <span className="max-w-[50%] text-right text-xs text-[var(--gn-text-muted)]">
                {r.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Generate a tiny 1x1 PNG so we don't ship binary fixtures. */
function makeTestPng(): Blob {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  return new Blob([bytes], { type: "image/png" });
}
