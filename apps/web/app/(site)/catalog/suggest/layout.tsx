import type { Metadata } from "next";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Suggest a catalog entry",
  description: `Propose a new cultivar or seed source, or suggest edits, on ${SITE_NAME}. Staff review all submissions.`,
  openGraph: {
    title: `Suggest an entry · ${SITE_NAME}`,
    url: canonicalPath("/catalog/suggest"),
  },
  alternates: { canonical: canonicalPath("/catalog/suggest") },
};

export default function CatalogSuggestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
