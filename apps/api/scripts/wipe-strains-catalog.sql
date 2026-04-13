-- One-off catalog reset (production or staging): removes all strains and breeders.
-- Strain reviews CASCADE with strains. Notebooks keep rows; strain_id becomes NULL (FK ON DELETE SET NULL).
--
-- Run in Supabase SQL editor or: psql "$DATABASE_URL" -f apps/api/scripts/wipe-strains-catalog.sql
-- Then import: pnpm --filter @growers/api db:import-strains -- /path/to/leafly_strain_data.csv
--
-- Verify licensing/ToS for any third-party strain dataset before loading.

BEGIN;

DELETE FROM public.strains;
DELETE FROM public.breeders;

COMMIT;
