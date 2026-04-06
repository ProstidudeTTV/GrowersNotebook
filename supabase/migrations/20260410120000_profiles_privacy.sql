-- Profile visibility and public grower stats (Nest: ProfilesService / PATCH /profiles/me)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_grower_stats_public boolean NOT NULL DEFAULT true;
