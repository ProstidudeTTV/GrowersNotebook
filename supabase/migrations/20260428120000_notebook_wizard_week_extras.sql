-- Keep in sync with apps/api/drizzle/0022_notebook_wizard_and_week_extras.sql
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "setup_wizard_completed_at" timestamp with time zone;

ALTER TABLE "notebook_weeks" ADD COLUMN IF NOT EXISTS "ppm" varchar(32);
ALTER TABLE "notebook_weeks" ADD COLUMN IF NOT EXISTS "water_notes" text;
