-- Optional granular scores on catalog reviews (1–5 integers per category).
ALTER TABLE "public"."strain_reviews"
  ADD COLUMN IF NOT EXISTS "sub_ratings" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "public"."breeder_reviews"
  ADD COLUMN IF NOT EXISTS "sub_ratings" jsonb NOT NULL DEFAULT '{}'::jsonb;
