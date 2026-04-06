-- Images and videos embedded in posts (TipTap → Supabase Storage public URLs).
-- Paths: `{user_id}/{uuid}.jpg` or `.mp4` / `.webm` / `.mov`

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "post_media_select_public" ON storage.objects;
DROP POLICY IF EXISTS "post_media_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "post_media_update_own" ON storage.objects;
DROP POLICY IF EXISTS "post_media_delete_own" ON storage.objects;

CREATE POLICY "post_media_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "post_media_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-media'
    AND split_part(name, '/', 1) = (auth.uid())::text
  );

CREATE POLICY "post_media_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND split_part(name, '/', 1) = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'post-media'
    AND split_part(name, '/', 1) = (auth.uid())::text
  );

CREATE POLICY "post_media_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND split_part(name, '/', 1) = (auth.uid())::text
  );
