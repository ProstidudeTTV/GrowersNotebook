-- Veg / flower light schedules live on the notebook, not on each week row.
ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS veg_light_cycle text,
  ADD COLUMN IF NOT EXISTS flower_light_cycle text;
