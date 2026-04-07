-- Profile-scoped Matrix secret-storage (4S) wrap for cross-device DM history.
-- Nest: MatrixSsssWrapService, Drizzle migration 0013_profile_matrix_ssss_wrap.sql
-- Run `pnpm --filter @growers/api db:migrate` against the same Supabase Postgres (or apply via Supabase CLI).

CREATE TABLE IF NOT EXISTS public.profile_matrix_ssss_wrap (
  profile_id uuid PRIMARY KEY NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
