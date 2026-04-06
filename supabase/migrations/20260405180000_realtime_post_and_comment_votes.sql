-- Enables postgres_changes on vote tables when `post_id=eq.<uuid>` or globally.
-- Requires `comment_votes.post_id` (see Drizzle migration 0001_faithful_squadron_supreme).
-- Run in Supabase SQL Editor or via `supabase db push` if you use the local CLI.

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_votes;
