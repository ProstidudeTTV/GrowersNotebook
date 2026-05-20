ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS icon_url text;

COMMENT ON COLUMN public.communities.icon_url IS
  'Public https URL (community-banners bucket) for square community avatar on directory and community page.';
