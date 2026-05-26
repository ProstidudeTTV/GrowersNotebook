-- `sync_post_vote_counts()` is a SECURITY DEFINER trigger helper and should not
-- be callable through `/rest/v1/rpc`.

REVOKE EXECUTE ON FUNCTION public.sync_post_vote_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_post_vote_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_post_vote_counts() FROM authenticated;
