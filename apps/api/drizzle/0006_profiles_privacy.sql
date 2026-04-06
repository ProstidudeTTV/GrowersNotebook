ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_public" boolean DEFAULT true NOT NULL;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "show_grower_stats_public" boolean DEFAULT true NOT NULL;
