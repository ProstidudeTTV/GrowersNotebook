-- Denormalized post vote tallies + feed sort indexes (Batch 4-A).

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_score integer NOT NULL DEFAULT 0;

UPDATE public.posts p
SET
  upvote_count = COALESCE(v.up, 0),
  downvote_count = COALESCE(v.down, 0),
  vote_score = COALESCE(v.score, 0)
FROM (
  SELECT
    post_id,
    COUNT(*) FILTER (WHERE value = 1)::int AS up,
    COUNT(*) FILTER (WHERE value = -1)::int AS down,
    COALESCE(SUM(value), 0)::int AS score
  FROM public.post_votes
  GROUP BY post_id
) v
WHERE p.id = v.post_id;

CREATE OR REPLACE FUNCTION public.sync_post_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);

  UPDATE public.posts
  SET
    upvote_count = (
      SELECT COUNT(*)::int
      FROM public.post_votes
      WHERE post_id = pid AND value = 1
    ),
    downvote_count = (
      SELECT COUNT(*)::int
      FROM public.post_votes
      WHERE post_id = pid AND value = -1
    ),
    vote_score = COALESCE((
      SELECT SUM(value)::int
      FROM public.post_votes
      WHERE post_id = pid
    ), 0)
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS post_votes_sync_counts ON public.post_votes;
CREATE TRIGGER post_votes_sync_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_vote_counts();

CREATE INDEX IF NOT EXISTS posts_created_at_desc_idx
  ON public.posts (created_at DESC);

CREATE INDEX IF NOT EXISTS posts_author_created_at_desc_idx
  ON public.posts (author_id, created_at DESC);
