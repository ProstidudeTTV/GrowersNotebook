-- Public buckets do not need broad SELECT policies on `storage.objects` for
-- object URLs to work. Removing them stops Storage API bucket listing.

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "post_media_select_public" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_public_read" ON storage.objects;
DROP POLICY IF EXISTS "community_banners_select_public" ON storage.objects;
