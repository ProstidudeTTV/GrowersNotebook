-- Link cultivars to parent strains in the catalog (admin curation).
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS parent_strain_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS strains_parent_strain_ids_gin_idx
  ON strains USING gin (parent_strain_ids);
