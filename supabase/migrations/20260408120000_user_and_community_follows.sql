-- Follows / joins (Nest/Drizzle migration 0004_follows).
-- Tables first (no inline FK names), then constraints — matches apps/api/drizzle/0004_follows.sql.

CREATE TABLE IF NOT EXISTS public.community_follows (
  user_id uuid NOT NULL,
  community_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, community_id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);

DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_follows_user_id_profiles_id_fk'
  ) THEN
    ALTER TABLE public.community_follows
      ADD CONSTRAINT community_follows_user_id_profiles_id_fk
      FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_follows_community_id_communities_id_fk'
  ) THEN
    ALTER TABLE public.community_follows
      ADD CONSTRAINT community_follows_community_id_communities_id_fk
      FOREIGN KEY (community_id) REFERENCES public.communities (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_follower_id_profiles_id_fk'
  ) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_follower_id_profiles_id_fk
      FOREIGN KEY (follower_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_following_id_profiles_id_fk'
  ) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_following_id_profiles_id_fk
      FOREIGN KEY (following_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
  END IF;
END
$migrate$;

CREATE INDEX IF NOT EXISTS community_follows_community_idx ON public.community_follows (community_id);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON public.user_follows (following_id);
