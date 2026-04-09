-- Keep in sync with apps/api/drizzle/0025_notebook_veg_flower_light.sql
ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS veg_light_cycle text,
  ADD COLUMN IF NOT EXISTS flower_light_cycle text;
