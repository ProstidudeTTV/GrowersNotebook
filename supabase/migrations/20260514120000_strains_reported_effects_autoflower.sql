-- Structured Leafly-style reported effect percentages + autoflower flag for catalog filters.

ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS reported_effect_pcts jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS is_autoflower boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS strains_autoflower_published_idx ON strains (is_autoflower);

-- Best-effort backfill for autoflower from existing prose (import CSV often repeats this in notes).
UPDATE strains
SET is_autoflower = true
WHERE is_autoflower = false
  AND (
    description ~* 'autoflow'
    OR description ~* 'ruderalis'
    OR effects_notes ~* 'autoflow'
    OR effects_notes ~* 'ruderalis'
    OR effects_notes ~* 'Flowering type:[[:space:]]*[Aa]uto'
  );
