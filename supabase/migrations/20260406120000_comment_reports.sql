-- Comment reports for moderation (Nest/Drizzle migration 0002_comment_reports).
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  comment_id uuid NOT NULL REFERENCES public.comments (id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS comment_reports_post_idx ON public.comment_reports (post_id);
CREATE UNIQUE INDEX IF NOT EXISTS comment_reports_comment_reporter_uq ON public.comment_reports (comment_id, reporter_id);
