import type { Metadata } from "next";
import Link from "next/link";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

type NotebookListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  customStrainLabel: string | null;
  owner: { id: string; displayName: string | null };
  strain: { slug: string; name: string | null } | null;
  score: number;
};

export const metadata: Metadata = {
  title: `Notebooks · ${SITE_NAME}`,
  description: `Public notebooks on ${SITE_NAME}.`,
  alternates: { canonical: canonicalPath("/notebooks") },
};

function buildListQuery(opts: {
  page: number;
  pageSize: number;
  status?: string;
  q?: string;
}): string {
  const p = new URLSearchParams();
  p.set("page", String(opts.page));
  p.set("pageSize", String(opts.pageSize));
  if (
    opts.status === "active" ||
    opts.status === "completed" ||
    opts.status === "archived"
  ) {
    p.set("status", opts.status);
  }
  if (opts.q?.trim()) p.set("q", opts.q.trim());
  return p.toString();
}

export default async function NotebooksDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const statusRaw = sp.status?.trim() ?? "";
  const status =
    statusRaw === "active" ||
    statusRaw === "completed" ||
    statusRaw === "archived"
      ? statusRaw
      : "";
  const q = sp.q ?? "";
  let data: {
    items: NotebookListItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  try {
    const qs = buildListQuery({ page, pageSize: 24, status, q });
    data = await apiFetch<typeof data>(`/notebooks?${qs}`, {
      timeoutMs: 12_000,
    });
  } catch {
    data = { items: [], total: 0, page: 1, pageSize: 24 };
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">Notebooks</h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Public notebooks shared by the community.
      </p>
      <Link
        href="/notebooks/new"
        className="mt-6 inline-flex rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,69,0,0.35)] hover:bg-[#ff5414]"
      >
        Set up your notebook
      </Link>

      <form
        method="get"
        className="mt-8 flex flex-col gap-4 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="block min-w-[12rem] flex-1 text-sm">
          <span className="font-medium text-[var(--gn-text)]">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Title or strain…"
            className="gn-input mt-1 w-full"
            autoComplete="off"
          />
        </label>
        <label className="block w-full text-sm sm:w-44">
          <span className="font-medium text-[var(--gn-text)]">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="gn-input mt-1 w-full"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            Apply filters
          </button>
          <Link
            href="/notebooks"
            className="rounded-full border border-[var(--gn-divide)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
          >
            Clear
          </Link>
        </div>
      </form>

      <ul className="mt-8 space-y-3">
        {data.items.map((n) => {
          const grower = n.owner.displayName?.trim() || "Grower";
          const strain =
            n.strain?.name?.trim() || n.customStrainLabel?.trim() || null;
          return (
            <li key={n.id}>
              <Link
                href={`/notebooks/${encodeURIComponent(n.id)}`}
                className="block rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 transition hover:border-[var(--gn-text-muted)]"
              >
                <p className="font-semibold text-[var(--gn-text)]">{n.title}</p>
                <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                  {grower}
                  {strain ? ` · ${strain}` : ""}
                </p>
                <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                  Score {n.score} · {n.status}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {data.total > data.pageSize ? (
        <div className="mt-6 flex gap-4 text-sm">
          {data.page > 1 ? (
            <Link
              href={`/notebooks?${buildListQuery({
                page: data.page - 1,
                pageSize: data.pageSize,
                status,
                q,
              })}`}
              className="text-[#ff4500] hover:underline"
            >
              Previous
            </Link>
          ) : null}
          {data.page * data.pageSize < data.total ? (
            <Link
              href={`/notebooks?${buildListQuery({
                page: data.page + 1,
                pageSize: data.pageSize,
                status,
                q,
              })}`}
              className="text-[#ff4500] hover:underline"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
