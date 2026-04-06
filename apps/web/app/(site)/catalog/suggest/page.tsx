import Link from "next/link";
import { CatalogSuggestClient } from "@/components/catalog/catalog-suggest-client";

export default function CatalogSuggestPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Suggest a catalog entry
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Propose a new strain or breeder, or suggest corrections. Staff review
        all submissions before anything goes live.
      </p>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        <Link href="/login" className="text-[#ff6a38] hover:underline">
          Sign in
        </Link>{" "}
        to submit. Read the{" "}
        <Link href="/strains" className="text-[#ff6a38] hover:underline">
          strains
        </Link>{" "}
        and{" "}
        <Link href="/breeders" className="text-[#ff6a38] hover:underline">
          breeders
        </Link>{" "}
        first to avoid duplicates.
      </p>
      <div className="mt-6">
        <CatalogSuggestClient />
      </div>
    </main>
  );
}
