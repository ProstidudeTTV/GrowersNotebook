-- Optional image attachment for direct messages (public post-media URL).
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS image_url text;
