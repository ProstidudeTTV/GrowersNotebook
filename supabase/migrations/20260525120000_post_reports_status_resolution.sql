-- Post report resolution fields (mirror comment_reports / profile_reports).
ALTER TABLE public.post_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reporter_message text,
  ADD COLUMN IF NOT EXISTS notify_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_warning text;
