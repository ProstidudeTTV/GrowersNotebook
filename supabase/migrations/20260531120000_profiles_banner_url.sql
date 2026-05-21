-- Profile cover banner (public https URL in `avatars` bucket: `{user_id}/banner-*.jpg`).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banner_url text;

COMMENT ON COLUMN profiles.banner_url IS 'Optional wide cover image URL (Supabase avatars bucket).';
