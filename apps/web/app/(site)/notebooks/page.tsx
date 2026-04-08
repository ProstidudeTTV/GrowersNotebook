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
  description: `Public grow diaries on ${SITE_NAME}.`,
  alternates: { canonical: canonicalPath("/notebooks") },
};

export default async function NotebooksDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  let data: {
    items: NotebookListItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  try {
    data = await apiFetch<typeof data>(
      `/notebooks?page=${page}&pageSize=24`,
      { timeoutMs: 12_000 },
    );
  } catch {
    data = { items: [], total: 0, page: 1, pageSize: 24 };
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">Notebooks</h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Grow diaries shared by the community.
      </p>
      <Link
        href="/notebooks/new"
        className="mt-6 inline-flex rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,69,0,0.35)] hover:bg-[#ff5414]"
      >
        Start a notebook
      </Link>

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
              href={`/notebooks?page=${data.page - 1}`}
              className="text-[#ff4500] hover:underline"
            >
              Previous
            </Link>
          ) : null}
          {data.page * data.pageSize < data.total ? (
            <Link
              href={`/notebooks?page=${data.page + 1}`}
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
