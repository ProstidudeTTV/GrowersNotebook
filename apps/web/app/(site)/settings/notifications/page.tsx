import type { Metadata } from "next";
import { NotificationsSettingsForm } from "./notifications-settings-form";

export const metadata: Metadata = {
  title: "Notification settings",
};

export default function NotificationsSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Notifications
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--gn-text-muted)]">
        Choose which alerts land in your inbox and on the bell icon. Changes
        save the moment you flip a toggle.
      </p>
      <div className="gn-card-subtle mt-8 p-6">
        <NotificationsSettingsForm />
      </div>
    </div>
  );
}
