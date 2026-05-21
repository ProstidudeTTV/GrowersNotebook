import { adminFetchServer } from "@/lib/admin/server";
import { AdminHealthClient } from "./health-client";

/**
 * Admin function test page — runs real requests against every layer and shows
 * exactly which one is failing. This is the "what's actually broken right now"
 * dashboard for diagnosing 503s, auth failures, storage misconfig, etc.
 */

export const dynamic = "force-dynamic";

type StaffMe = {
  id: string;
  role: string;
  displayName: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  canChangeRoles: boolean;
  storageConfigured: boolean;
};

type ModStats = {
  openPostReports: number;
  openCommentReports: number;
  openProfileReports: number;
};

export default async function AdminHealthPage() {
  const me = await adminFetchServer<StaffMe>("/me");
  const isAdmin = me.ok && me.data.role === "admin";

  const [stats, postRep, commentRep, profileRep, profiles, communities, audit] =
    await Promise.all([
      adminFetchServer<ModStats>("/moderation-stats"),
      adminFetchServer<unknown[]>("/post-reports", {
        query: { _start: 0, _end: 1 },
      }),
      adminFetchServer<unknown[]>("/comment-reports", {
        query: { _start: 0, _end: 1 },
      }),
      adminFetchServer<unknown[]>("/profile-reports", {
        query: { _start: 0, _end: 1 },
      }),
      adminFetchServer<unknown[]>("/profiles", { query: { _start: 0, _end: 1 } }),
      isAdmin
        ? adminFetchServer<unknown[]>("/communities", {
            query: { _start: 0, _end: 1 },
          })
        : Promise.resolve({
            ok: true as const,
            status: 200,
            data: [] as unknown[],
            totalCount: 0,
            skipped: true,
            message: "Skipped (admin-only endpoint)",
          }),
      isAdmin
        ? adminFetchServer<unknown[]>("/audit-events", {
            query: { _start: 0, _end: 1 },
          })
        : Promise.resolve({
            ok: true as const,
            status: 200,
            data: [] as unknown[],
            totalCount: 0,
            skipped: true,
            message: "Skipped (admin-only endpoint)",
          }),
    ]);

  const envInfo = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ? "set" : "MISSING",
    INTERNAL_API_URL: process.env.INTERNAL_API_URL
      ? "set (server-side API base for gn-proxy / admin fetches)"
      : "not set — falls back to NEXT_PUBLIC_API_URL",
  };

  const storageConfigured = me.ok ? me.data.storageConfigured : null;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Admin function test</h1>
        <p className="text-sm text-[var(--gn-text-muted)]">
          Real HTTP calls against every admin endpoint. Use this when uploads fail
          or pages look empty — it tells you exactly which service is misconfigured.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] p-5">
        <h2 className="mb-3 text-lg font-bold">Web service environment</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {Object.entries(envInfo).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="font-mono text-xs text-[var(--gn-text-muted)]">{k}</dt>
              <dd className={v === "MISSING" ? "text-red-500" : "text-[var(--gn-accent)]"}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          <strong className="text-[var(--gn-text)]">INTERNAL_API_URL</strong> is the
          Nest API base URL the Next.js server uses for{" "}
          <code className="font-mono">/api/gn-proxy</code> and admin server fetches.
          On Render it is usually the same as{" "}
          <code className="font-mono">NEXT_PUBLIC_API_URL</code> (
          <code className="font-mono">https://growers-notebook-api.onrender.com</code>
          ). Browsers never see it; only server-side code does.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] p-5">
        <h2 className="mb-3 text-lg font-bold">API endpoint checks</h2>
        <ul className="divide-y divide-[var(--gn-ring)] text-sm">
          <CheckRow label="GET /admin/me (staff session + storage flag)" result={me} />
          <CheckRow label="GET /admin/moderation-stats" result={stats} />
          <CheckRow label="GET /admin/post-reports?_start=0&_end=1" result={postRep} />
          <CheckRow label="GET /admin/comment-reports?_start=0&_end=1" result={commentRep} />
          <CheckRow label="GET /admin/profile-reports?_start=0&_end=1" result={profileRep} />
          <CheckRow label="GET /admin/profiles?_start=0&_end=1" result={profiles} />
          <CheckRow
            label="GET /admin/communities?_start=0&_end=1 (admin only)"
            result={communities}
          />
          <CheckRow
            label="GET /admin/audit-events?_start=0&_end=1 (admin only)"
            result={audit}
          />
        </ul>
      </section>

      {me.ok ? (
        <section className="rounded-2xl border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] p-5">
          <h2 className="mb-3 text-lg font-bold">Your staff session</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Row k="Profile ID" v={me.data.id} mono />
            <Row k="Display name" v={me.data.displayName ?? "—"} />
            <Row k="Role" v={me.data.role} />
            <Row k="Can change roles" v={me.data.canChangeRoles ? "yes" : "no"} />
            <Row
              k="API storage (SUPABASE_SERVICE_ROLE_KEY)"
              v={me.data.storageConfigured ? "configured" : "MISSING on API service"}
              danger={!me.data.storageConfigured}
            />
          </dl>
        </section>
      ) : null}

      <AdminHealthClient storageConfigured={storageConfigured} />

      <section className="rounded-2xl border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] p-5">
        <h2 className="mb-3 text-lg font-bold">How to fix common failures</h2>
        <ul className="space-y-3 text-sm text-[var(--gn-text-muted)]">
          <li>
            <strong className="text-[var(--gn-text)]">All checks fail with 503 from proxy:</strong>{" "}
            <code>NEXT_PUBLIC_API_URL</code> is missing on <code>growers-notebook-web</code>. Set it to{" "}
            <code>https://growers-notebook-api.onrender.com</code> (or your API URL) and redeploy.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">/admin/me works but storage = MISSING:</strong>{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> (or <code>SUPABASE_SECRET_KEY</code>) and{" "}
            <code>SUPABASE_URL</code> are missing on <code>growers-notebook-api</code>. Set both on
            the API service and redeploy.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">/admin/me returns 401:</strong> Sign-in is
            expired. Refresh the page and sign in again.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">/admin/me returns 403:</strong> Your profile
            role is not admin/moderator. Promote yourself in the profiles table.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Only some endpoints fail with 403:</strong>{" "}
            You signed in as moderator and those endpoints are admin-only (audit log, communities
            CRUD, etc.).
          </li>
        </ul>
      </section>
    </div>
  );
}

function CheckRow({
  label,
  result,
}: {
  label: string;
  result: Awaited<ReturnType<typeof adminFetchServer>> & {
    skipped?: boolean;
    message?: string;
  };
}) {
  const skipped = "skipped" in result && result.skipped;
  return (
    <li className="flex items-start justify-between gap-4 py-2">
      <span className="font-mono text-xs text-[var(--gn-text)] sm:text-sm">{label}</span>
      <span className="flex-shrink-0">
        {skipped ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gn-surface-muted)] px-3 py-0.5 text-xs font-semibold text-[var(--gn-text-muted)]">
            N/A (moderator)
          </span>
        ) : result.ok ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gn-accent)]/15 px-3 py-0.5 text-xs font-semibold text-[var(--gn-accent)]">
            {result.status} OK
            {typeof result.totalCount === "number" ? ` · total=${result.totalCount}` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-0.5 text-xs font-semibold text-red-400">
            {result.status || "ERR"} · {result.source}
          </span>
        )}
      </span>
      {!result.ok ? (
        <span className="hidden max-w-[40%] flex-shrink truncate text-xs text-red-300 sm:inline">
          {result.message}
        </span>
      ) : null}
    </li>
  );
}

function Row({
  k,
  v,
  mono,
  danger,
}: {
  k: string;
  v: string;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-mono text-xs text-[var(--gn-text-muted)]">{k}</dt>
      <dd
        className={`${mono ? "font-mono text-xs" : "text-sm"} ${danger ? "text-red-400" : "text-[var(--gn-text)]"}`}
      >
        {v}
      </dd>
    </div>
  );
}
