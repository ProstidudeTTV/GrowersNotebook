-- Row Level Security for public tables: satisfies Supabase linter and blocks PostgREST
-- bulk reads/writes with the anon key except where explicitly allowed.
-- The Nest API uses the Postgres connection (table owner / privileged role) and bypasses RLS.
--
-- Realtime (postgres_changes) still receives events for comments / votes because
-- anon + authenticated have SELECT policies on those tables (same openness as pre-RLS
-- for guest live threads; all other application data is denied via PostgREST).

-- Core social & app tables (deny-by-default for anon/authenticated unless policy below)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.name_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeder_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strain_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrient_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_week_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_week_waterings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Already had RLS from earlier migrations: dm_*, user_notifications, user_blocks.
-- Ensure these stay enabled (idempotent).
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_thread_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Realtime-covered tables: SELECT for anon + authenticated (live vote/comment UI + guests).
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gn_comments_select_realtime ON public.comments;
CREATE POLICY gn_comments_select_realtime
  ON public.comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS gn_post_votes_select_realtime ON public.post_votes;
CREATE POLICY gn_post_votes_select_realtime
  ON public.post_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS gn_comment_votes_select_realtime ON public.comment_votes;
CREATE POLICY gn_comment_votes_select_realtime
  ON public.comment_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);
