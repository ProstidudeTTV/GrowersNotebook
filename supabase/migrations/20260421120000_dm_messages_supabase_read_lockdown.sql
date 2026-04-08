-- Stop exposing DM plaintext to Supabase PostgREST / Realtime for the `authenticated` role.
-- Message content is loaded only via Nest (DATABASE_URL) which bypasses RLS.
DROP POLICY IF EXISTS dm_messages_select_own_thread ON public.dm_messages;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.dm_messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
