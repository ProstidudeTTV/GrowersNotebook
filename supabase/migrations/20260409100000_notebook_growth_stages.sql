-- Growth stages + harvest photos (mirrors apps/api/drizzle/0023_notebook_growth_stages.sql)
DO $$ BEGIN
  CREATE TYPE notebook_growth_stage AS ENUM ('germination', 'vegetation', 'flower', 'harvest');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS growth_stage notebook_growth_stage NOT NULL DEFAULT 'germination';

ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS veg_phase_started_after_week_index integer;

ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS flower_phase_started_after_week_index integer;

ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS harvest_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE notebooks SET growth_stage = 'flower'
WHERE growth_stage = 'germination'
  AND created_at < '2026-04-09T00:00:00.000Z'::timestamptz;
