"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NotebookSetupWizard } from "@/components/notebooks/notebook-setup-wizard";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export default function NewNotebookPage() {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);

  const start = async () => {
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) {
      router.push("/login?next=/notebooks/new");
      return;
    }
    setWizardOpen(true);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-[var(--gn-text)]">
        Set up your notebook
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        We&apos;ll walk you through name, setup, and environment. Your diary is
        only saved when you finish—closing early does not create an empty
        notebook. After that, this page shows your summary and weekly entries;{" "}
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
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-full bg-[#ff4500] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      <NotebookSetupWizard
        open={wizardOpen}
        notebook={null}
        onClose={() => setWizardOpen(false)}
        onCompleted={async (createdId) => {
          setWizardOpen(false);
          if (createdId) {
            router.push(`/notebooks/${encodeURIComponent(createdId)}`);
          }
        }}
      />
    </main>
  );
}
