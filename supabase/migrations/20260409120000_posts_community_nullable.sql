-- Profile posts: community optional (null = post on user profile only).
ALTER TABLE public.posts ALTER COLUMN community_id DROP NOT NULL;
