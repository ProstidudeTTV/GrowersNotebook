-- Mirrors apps/api/drizzle/0028_report_moderation_notifications.sql (report queue + notification kinds).

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'general';

ALTER TABLE public.comment_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reporter_message text,
  ADD COLUMN IF NOT EXISTS notify_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_warning text;

ALTER TABLE public.profile_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reporter_message text,
  ADD COLUMN IF NOT EXISTS notify_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_warning text;
