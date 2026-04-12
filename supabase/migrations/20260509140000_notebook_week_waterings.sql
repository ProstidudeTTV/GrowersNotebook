CREATE TABLE notebook_week_waterings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES notebook_weeks (id) ON DELETE CASCADE,
  notes text,
  volume_liters numeric(12, 3),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX notebook_week_waterings_week_idx ON notebook_week_waterings (week_id);

-- One child row per week that had legacy water fields set.
INSERT INTO notebook_week_waterings (week_id, notes, volume_liters, sort_order)
SELECT id,
  NULLIF(trim(water_notes), ''),
  water_volume_liters,
  0
FROM notebook_weeks
WHERE (water_notes IS NOT NULL AND btrim(water_notes) <> '')
   OR water_volume_liters IS NOT NULL;
