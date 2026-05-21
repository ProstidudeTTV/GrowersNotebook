import type { Metadata } from "next";
import { SnagErrorView } from "@/components/snag-error-view";

export const metadata: Metadata = {
  title: "Something went wrong",
  robots: { index: false, follow: false },
};

/** Public snag page — used when admin access is denied and for explicit redirects. */
export default function SnagPage() {
  return <SnagErrorView showHomeLink />;
}
