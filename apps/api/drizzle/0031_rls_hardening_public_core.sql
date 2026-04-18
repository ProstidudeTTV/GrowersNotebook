-- Row Level Security for public tables (mirror supabase/migrations/20260519120000_rls_hardening_public_core.sql).
-- Nest API bypasses RLS via privileged DB role; PostgREST uses anon/authenticated.

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

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_thread_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

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
