import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthNav } from "@/components/auth-nav";
import { MessagesNavLink } from "@/components/messages-nav-link";
import { NotificationsNavLink } from "@/components/notifications-nav-link";
import { SiteHeaderSearch } from "@/components/site-header-search";

const brandClass =
  "text-lg font-semibold tracking-tight text-[#ff4500] transition hover:drop-shadow-[0_0_10px_rgba(255,69,0,0.5)]";

const DISCORD_INVITE_URL = "https://discord.gg/qGvv9knhdA";

const discordNavLinkClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[#5865F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5865F2]";

function IconDiscord({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.445.865-.608 1.25a17.915 17.915 0 0 0-5.487 0c-.164-.393-.406-.874-.618-1.25a.077.077 0 0 0-.078-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.1 18.058a.082.082 0 0 0 .031.056c2.053 1.508 4.041 2.423 5.993 3.03a.078.078 0 0 0 .084-.028 14.098 14.098 0 0 0 1.226-1.994.077.077 0 0 0-.042-.106 12.348 12.348 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.121.099.247.198.373.292a.077.077 0 0 1-.007.128c-.653.247-1.274.55-1.872.891a.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028c1.96-.607 3.95-1.522 6.002-3.029a.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419Z" />
    </svg>
  );
}

function DiscordNavLink() {
  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={discordNavLinkClass}
      aria-label="Discord (opens in new tab)"
    >
      <IconDiscord className="h-[1.125rem] w-[1.125rem] shrink-0" />
      <span className="hidden sm:inline">Discord</span>
    </a>
  );
}

function HeaderNavActions() {
  return (
    <>
      <MessagesNavLink />
      <NotificationsNavLink />
      <DiscordNavLink />
      <AuthNav />
    </>
  );
}

function SearchFallback() {
  return (
    <div
      className="h-10 w-full max-w-md animate-pulse rounded-lg bg-[var(--gn-surface-muted)]"
      aria-hidden
    />
  );
}

export function SiteHeader({ leading }: { leading?: ReactNode }) {
  return (
    <header className="gn-header sticky top-0 z-[100]">
      {/* Desktop: brand | search (centered) | messages / discord / auth */}
      <div className="hidden w-full flex-col lg:flex">
        <div className="flex min-h-14 w-full min-w-0">
          <div className="flex w-56 shrink-0 items-center px-2 py-3">
            <Link
              href="/"
              className={`min-w-0 truncate rounded-lg px-3 py-2 ${brandClass}`}
            >
              Growers Notebook
            </Link>
          </div>
          <div className="flex min-h-14 min-w-0 flex-1 items-center gap-4 px-3 py-3 pr-4">
            <div className="flex min-w-0 flex-1 justify-center">
              <Suspense fallback={<SearchFallback />}>
                <SiteHeaderSearch />
              </Suspense>
            </div>
            <nav className="flex shrink-0 items-center gap-3">
              <HeaderNavActions />
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile: title row + full-width search — no overflow-x-hidden on this wrapper (clips dropdowns vertically per CSS overflow rules). */}
      <div className="flex flex-col lg:hidden">
        <div className="flex min-h-14 min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            {leading ? (
              <div className="flex shrink-0 items-center">{leading}</div>
            ) : null}
            {/* flex-1 + min-w-0 so the brand can shrink; nav stays icon-first on narrow widths */}
            <Link
              href="/"
              className={`min-w-0 flex-1 truncate ${brandClass}`}
            >
              <span className="sm:hidden">GN</span>
              <span className="hidden sm:inline">Growers Notebook</span>
            </Link>
          </div>
          <nav className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-3">
            <HeaderNavActions />
          </nav>
        </div>
        <div className="border-t border-[var(--gn-divide)] px-4 pb-3 pt-3 sm:px-4">
          <Suspense fallback={<SearchFallback />}>
            <SiteHeaderSearch />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
