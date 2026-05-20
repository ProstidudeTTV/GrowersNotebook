ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "show_follow_lists_public" boolean DEFAULT true NOT NULL;
