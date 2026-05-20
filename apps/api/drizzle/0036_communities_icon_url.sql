ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS icon_url text;
