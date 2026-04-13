-- Structured catalog fields (Leafly-style imports + UI filters).
ALTER TABLE public.strains
  ADD COLUMN IF NOT EXISTS chemotype text,
  ADD COLUMN IF NOT EXISTS genetics text;

ALTER TABLE public.strains DROP CONSTRAINT IF EXISTS strains_chemotype_check;
ALTER TABLE public.strains ADD CONSTRAINT strains_chemotype_check
  CHECK (chemotype IS NULL OR chemotype IN ('indica', 'sativa', 'hybrid'));

CREATE INDEX IF NOT EXISTS strains_chemotype_idx ON public.strains (chemotype)
  WHERE chemotype IS NOT NULL;

-- Backfill chemotype from imported effects_notes "Type: …" lines and description keywords.
UPDATE public.strains
SET chemotype = 'hybrid'
WHERE chemotype IS NULL
  AND (
    effects_notes ~* 'Type:\s*Hybrid'
    OR effects_notes ~* 'Type:\s*.*hybrid'
    OR (
      description IS NOT NULL
      AND lower(description) LIKE '%hybrid%'
      AND lower(description) NOT LIKE '%non-hybrid%'
    )
  );

UPDATE public.strains
SET chemotype = 'indica'
WHERE chemotype IS NULL
  AND (
    effects_notes ~* 'Type:\s*Indica'
    OR (
      description IS NOT NULL
      AND lower(description) ~ '(^|[^a-z])indica([^a-z]|$)'
      AND lower(description) NOT LIKE '%sativa%'
      AND lower(description) NOT LIKE '%hybrid%'
    )
  );

UPDATE public.strains
SET chemotype = 'sativa'
WHERE chemotype IS NULL
  AND (
    effects_notes ~* 'Type:\s*Sativa'
    OR (
      description IS NOT NULL
      AND lower(description) ~ '(^|[^a-z])sativa([^a-z]|$)'
      AND lower(description) NOT LIKE '%indica%'
      AND lower(description) NOT LIKE '%hybrid%'
    )
  );

-- Indica-dominant / sativa-dominant phrasing in descriptions
UPDATE public.strains
SET chemotype = 'hybrid'
WHERE chemotype IS NULL
  AND description IS NOT NULL
  AND (
    lower(description) LIKE '%indica-dominant%'
    OR lower(description) LIKE '%sativa-dominant%'
    OR lower(description) LIKE '% indica hybrid%'
    OR lower(description) LIKE '% sativa hybrid%'
  );
