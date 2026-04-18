import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `Terms of use for ${SITE_NAME} (summary; formal legal version may follow).`,
};

/**
 * Stub terms page: footer and IA hook. Replace with counsel-reviewed ToS.
 */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Terms of use
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Summary only—formal terms will be published here after legal review.
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--gn-text-muted)]">
        <p>
          By using {SITE_NAME}, you agree to follow community rules, respect
          other members, and comply with applicable laws. Moderators and staff
          may remove content or restrict accounts that break those rules.
        </p>
        <p>
          Content you post (including text, images, and links) is your
          responsibility. The platform does not guarantee confidentiality of
          user-submitted content in public or semi-public areas.
        </p>
        <p>
          For how we handle data and security practices, see{" "}
          <Link href="/privacy" className="text-[#ff6a38] hover:underline">
            Privacy &amp; security
          </Link>
          .
        </p>
      </div>

      <p className="mt-10 text-sm text-[var(--gn-text-muted)]">
        <Link href="/" className="text-[#ff6a38] hover:underline">
          ← Home
        </Link>
      </p>
    </main>
  );
}
