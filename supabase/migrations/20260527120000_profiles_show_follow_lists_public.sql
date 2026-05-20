ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_follow_lists_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_follow_lists_public IS
  'When false, only the account owner can view followers/following lists; counts may still show on profile card.';
