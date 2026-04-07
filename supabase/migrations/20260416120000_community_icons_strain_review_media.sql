-- Community visual icon key (chosen in admin; rendered from curated icon set on web).
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS icon_key text;

-- Strain review image attachments (https URLs, JSON array of {url, type}).
ALTER TABLE public.strain_reviews
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;
