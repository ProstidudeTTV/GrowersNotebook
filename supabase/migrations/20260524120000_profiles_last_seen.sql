-- Track per-profile last activity for the "Growers online now" badge on the guest landing.
-- The anon key can only call the SECURITY DEFINER function so we don't expose the
-- full `profiles` table through PostgREST.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_last_seen_idx
  ON public.profiles (last_seen);

CREATE OR REPLACE FUNCTION public.growers_online_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.profiles
  WHERE last_seen > now() - INTERVAL '15 minutes';
$$;

REVOKE ALL ON FUNCTION public.growers_online_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.growers_online_count() TO anon, authenticated, service_role;
