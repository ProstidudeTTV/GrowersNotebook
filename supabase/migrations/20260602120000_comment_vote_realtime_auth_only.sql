-- Tighten public Realtime exposure: signed-in growers can still subscribe to
-- comment/vote changes, but anon clients can no longer enumerate the tables via
-- PostgREST / Realtime.

DROP POLICY IF EXISTS gn_comments_select_realtime ON public.comments;
CREATE POLICY gn_comments_select_realtime
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS gn_post_votes_select_realtime ON public.post_votes;
CREATE POLICY gn_post_votes_select_realtime
  ON public.post_votes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS gn_comment_votes_select_realtime ON public.comment_votes;
CREATE POLICY gn_comment_votes_select_realtime
  ON public.comment_votes
  FOR SELECT
  TO authenticated
  USING (true);
