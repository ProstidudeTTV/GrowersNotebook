-- Allow site moderators (not only admins) to upload community banners/icons via
-- direct Supabase client when needed; admin UI prefers API service-role upload.

DROP POLICY IF EXISTS "community_banners_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_delete_admin" ON storage.objects;

CREATE POLICY "community_banners_insert_staff"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "community_banners_update_staff"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "community_banners_delete_staff"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );
