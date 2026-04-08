-- Multiple images per DM: JSON array of public post-media URLs (API-validated).
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.dm_messages
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND trim(image_url) <> ''
  AND (image_urls IS NULL OR image_urls = '[]'::jsonb);
