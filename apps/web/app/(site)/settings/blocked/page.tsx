import type { Metadata } from "next";
import { BlockedUsersSettings } from "../profile/blocked-users-settings";

export const metadata: Metadata = {
  title: "Blocked users",
};

export default function BlockedUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Blocked users
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--gn-text-muted)]">
        People you&apos;ve blocked cannot see your posts, send you messages, or
        interact with your content. You can unblock them at any time.
      </p>
      <div className="gn-card-subtle mt-8 p-6">
        <BlockedUsersSettings />
      </div>
    </div>
  );
}
