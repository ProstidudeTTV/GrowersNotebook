import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy & security",
  description: `How ${SITE_NAME} handles your data, photos, and account security.`,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Privacy &amp; security
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Our approach to protecting growers and being clear about limits.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Mission
        </h2>
        <p className="text-sm leading-relaxed text-[var(--gn-text-muted)]">
          {SITE_NAME} exists to give home growers a{" "}
          <span className="text-[var(--gn-text)]">trust-centered</span> place to
          share notebooks, strains, and conversations. {SITE_TAGLINE} We work
          to reduce unnecessary exposure of
          your data in the product, and to say plainly what we cannot promise
          (for example, full anonymity on the public internet).
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Security protocols
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--gn-text-muted)]">
          <li>
            <strong className="text-[var(--gn-text)]">Uploaded photos</strong>{" "}
            (posts, comments, messages, avatars) are re-encoded in your browser
            to JPEG before storage, which removes EXIF and most embedded image
            metadata from those files.{" "}
            <strong className="text-[var(--gn-text)]">Videos</strong>: the
            browser uploads them as-is; our servers may remux them to drop common
            container metadata (best-effort). Images you only link to from other
            sites are unchanged.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Transport</strong>: we use
            HTTPS for the site and API in production.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Database access</strong>:
            Row Level Security is enabled on public tables in Postgres so the
            public data API key cannot bulk-read private application data; the
            API server uses a privileged database role for writes. Direct
            message content is not delivered through live database subscriptions
            to clients.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Audit logs</strong>: when
            the API records mutating requests for moderation, client IP is stored
            in a truncated form (rough network area), not a full address.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Optional hardening</strong>
            : for stronger network privacy, consider the{" "}
            <a
              href="https://www.torproject.org/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff6a38] hover:underline"
            >
              Tor Browser
            </a>
            . It does not make you anonymous to us when you are signed in, and
            some auth flows may be harder on Tor.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Privacy overview
        </h2>
        <p className="text-sm text-[var(--gn-text-muted)]">
          This section summarizes what the service processes. Formal legal text
          may be added or updated with counsel.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--gn-text-muted)]">
          <li>
            <strong className="text-[var(--gn-text)]">Who we are</strong>: the
            operator of {SITE_NAME} (entity / contact to be listed in official
            policy).
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">What we collect</strong>:
            account and profile data from our sign-in provider (e.g. email), content you
            post, votes, follows, messages you send, notebook data, and technical
            data needed to run the service (including truncated IPs in audit
            events for mutating API requests).
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Cookies &amp; analytics</strong>:
            session and preferences; optional privacy-oriented analytics (e.g.
            Plausible) if enabled for the deployment—first-party, no
            cross-site ad profiles.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">International transfers</strong>:
            hosting and database providers may process data in the United States
            or other regions depending on your project configuration.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Vendor logging</strong>:
            infrastructure providers (e.g. host, database) may keep their own
            access and security logs, including connection metadata, according
            to their policies and retention.
          </li>
          <li>
            <strong className="text-[var(--gn-text)]">Limits</strong>: we cannot
            fully guarantee confidentiality of content you post or send—treat
            public areas as public. You are responsible for using the service
            lawfully.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-[var(--gn-text-muted)]">
        <Link href="/" className="text-[#ff6a38] hover:underline">
          ← Home
        </Link>
      </p>
    </main>
  );
}
