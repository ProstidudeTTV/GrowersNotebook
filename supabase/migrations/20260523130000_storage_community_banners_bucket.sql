-- Public community banner images uploaded from the admin community edit / create pages.
-- Paths: `{community_slug}/{timestamp}-{filename}`
-- Read is public so banners can render via <img>; write is restricted to admins via
-- a policy that checks the caller's profiles.role.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-banners',
  'community-banners',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "community_banners_select_public" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_delete_admin" ON storage.objects;

CREATE POLICY "community_banners_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-banners');

CREATE POLICY "community_banners_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "community_banners_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "community_banners_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
