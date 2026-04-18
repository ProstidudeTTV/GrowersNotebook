import type { Metadata } from "next";
import Link from "next/link";
import { BlockedUsersSettings } from "./blocked-users-settings";
import { ProfileSettingsForm } from "./profile-settings-form";

export const metadata: Metadata = {
  title: "Profile settings",
};

export default function ProfileSettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Profile &amp; privacy
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--gn-text-muted)]">
        Choose how your name and photo appear across GrowersNotebook and who
        can view your profile. Read{" "}
        <Link href="/privacy" className="text-[#ff6a38] hover:underline">
          Privacy &amp; security
        </Link>{" "}
        for our mission, photo metadata handling, and data overview.
      </p>
      <div className="gn-card-subtle mt-8 p-6">
        <ProfileSettingsForm />
      </div>
      <div className="gn-card-subtle mt-8 p-6">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Blocked users
        </h2>
        <div className="mt-4">
          <BlockedUsersSettings />
        </div>
      </div>
    </main>
  );
}
