-- Run against Supabase-hosted Postgres (or after `supabase db push`).
-- Enables postgres_changes subscriptions on `public.comments` for live threads.

ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
