import Link from "next/link";
import type { ReactNode } from "react";
import { AuthNav } from "@/components/auth-nav";

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
    >
      <IconDiscord className="h-[1.125rem] w-[1.125rem] shrink-0" />
      Discord
    </a>
  );
}

export function SiteHeader({ leading }: { leading?: ReactNode }) {
  return (
    <header className="gn-header sticky top-0 z-40">
      {/* Desktop: brand column matches sidebar width (w-56); padding matches sidebar nav (px-2 + link px-3) */}
      <div className="hidden min-h-14 w-full lg:flex">
        <div className="flex w-56 shrink-0 items-center px-2 py-3">
          <Link
            href="/"
            className={`min-w-0 truncate rounded-lg px-3 py-2 ${brandClass}`}
          >
            Growers Notebook
          </Link>
        </div>
        <div className="flex min-h-14 min-w-0 flex-1 items-center justify-end gap-3 px-4 py-3">
          <DiscordNavLink />
          <AuthNav />
        </div>
      </div>

      {/* Mobile: hamburger + title + auth */}
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {leading ? (
            <div className="flex shrink-0 items-center">{leading}</div>
          ) : null}
          <Link href="/" className={`min-w-0 truncate ${brandClass}`}>
            Growers Notebook
          </Link>
        </div>
        <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
          <DiscordNavLink />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
