-- Keep in sync with apps/api/drizzle/0024_notebook_unit_prefs.sql
ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS preferred_temp_unit text NOT NULL DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS preferred_volume_unit text NOT NULL DEFAULT 'L';

ALTER TABLE notebooks DROP CONSTRAINT IF EXISTS notebooks_preferred_temp_unit_chk;
ALTER TABLE notebooks
  ADD CONSTRAINT notebooks_preferred_temp_unit_chk CHECK (preferred_temp_unit IN ('C', 'F'));

ALTER TABLE notebooks DROP CONSTRAINT IF EXISTS notebooks_preferred_volume_unit_chk;
ALTER TABLE notebooks
  ADD CONSTRAINT notebooks_preferred_volume_unit_chk CHECK (preferred_volume_unit IN ('L', 'gal'));

ALTER TABLE notebook_weeks
  ADD COLUMN IF NOT EXISTS water_volume_liters numeric(12, 3);
