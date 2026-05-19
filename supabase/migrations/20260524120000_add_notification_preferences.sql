-- Per-user notification toggles for in-app / email notifications.
-- Defaults: every notification kind on. Direct PostgREST denied by gn_no_postgrest_profiles;
-- Nest writes via privileged DATABASE_URL or, where the page uses the browser Supabase client,
-- relies on a same-row owner policy added later if/when that path is exercised against RLS.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  DEFAULT '{"new_comment": true, "new_follower": true, "vote_milestone": true, "direct_message": true}'::jsonb;
