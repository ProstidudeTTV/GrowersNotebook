-- Satisfy Supabase linter "RLS Enabled No Policy" (INFO): explicit deny for anon/authenticated
-- on backend-only tables. Behavior unchanged (no policies previously meant deny); this documents intent.
-- PERMISSIVE policies OR together: tables with existing allow policies (comments, votes, dm_*, notifications)
-- are unchanged because allow policies still match.
--
-- Fixes "RLS Disabled in Public" on Drizzle's migration journal table.

ALTER TABLE IF EXISTS public."__drizzle_migrations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gn_no_postgrest___drizzle_migrations ON public."__drizzle_migrations";
CREATE POLICY gn_no_postgrest___drizzle_migrations ON public."__drizzle_migrations"
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Backend-only public tables (Nest uses privileged DB role; PostgREST clients denied)
DROP POLICY IF EXISTS gn_no_postgrest_audit_events ON public.audit_events;
CREATE POLICY gn_no_postgrest_audit_events ON public.audit_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_breeder_reviews ON public.breeder_reviews;
CREATE POLICY gn_no_postgrest_breeder_reviews ON public.breeder_reviews
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_breeders ON public.breeders;
CREATE POLICY gn_no_postgrest_breeders ON public.breeders
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_catalog_suggestions ON public.catalog_suggestions;
CREATE POLICY gn_no_postgrest_catalog_suggestions ON public.catalog_suggestions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_comment_reports ON public.comment_reports;
CREATE POLICY gn_no_postgrest_comment_reports ON public.comment_reports
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_communities ON public.communities;
CREATE POLICY gn_no_postgrest_communities ON public.communities
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_community_follows ON public.community_follows;
CREATE POLICY gn_no_postgrest_community_follows ON public.community_follows
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_community_moderators ON public.community_moderators;
CREATE POLICY gn_no_postgrest_community_moderators ON public.community_moderators
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_community_pins ON public.community_pins;
CREATE POLICY gn_no_postgrest_community_pins ON public.community_pins
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_dm_messages ON public.dm_messages;
CREATE POLICY gn_no_postgrest_dm_messages ON public.dm_messages
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_name_blocklist ON public.name_blocklist;
CREATE POLICY gn_no_postgrest_name_blocklist ON public.name_blocklist
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_notebook_comments ON public.notebook_comments;
CREATE POLICY gn_no_postgrest_notebook_comments ON public.notebook_comments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_notebook_votes ON public.notebook_votes;
CREATE POLICY gn_no_postgrest_notebook_votes ON public.notebook_votes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_notebook_week_nutrients ON public.notebook_week_nutrients;
CREATE POLICY gn_no_postgrest_notebook_week_nutrients ON public.notebook_week_nutrients
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_notebook_week_waterings ON public.notebook_week_waterings;
CREATE POLICY gn_no_postgrest_notebook_week_waterings ON public.notebook_week_waterings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_notebook_weeks ON public.notebook_weeks;
CREATE POLICY gn_no_postgrest_notebook_weeks ON public.notebook_weeks
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_notebooks ON public.notebooks;
CREATE POLICY gn_no_postgrest_notebooks ON public.notebooks
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_nutrient_products ON public.nutrient_products;
CREATE POLICY gn_no_postgrest_nutrient_products ON public.nutrient_products
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_post_reports ON public.post_reports;
CREATE POLICY gn_no_postgrest_post_reports ON public.post_reports
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_posts ON public.posts;
CREATE POLICY gn_no_postgrest_posts ON public.posts
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_profile_reports ON public.profile_reports;
CREATE POLICY gn_no_postgrest_profile_reports ON public.profile_reports
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_profiles ON public.profiles;
CREATE POLICY gn_no_postgrest_profiles ON public.profiles
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_site_config ON public.site_config;
CREATE POLICY gn_no_postgrest_site_config ON public.site_config
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_strain_reviews ON public.strain_reviews;
CREATE POLICY gn_no_postgrest_strain_reviews ON public.strain_reviews
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_strains ON public.strains;
CREATE POLICY gn_no_postgrest_strains ON public.strains
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_user_blocks ON public.user_blocks;
CREATE POLICY gn_no_postgrest_user_blocks ON public.user_blocks
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS gn_no_postgrest_user_follows ON public.user_follows;
CREATE POLICY gn_no_postgrest_user_follows ON public.user_follows
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
