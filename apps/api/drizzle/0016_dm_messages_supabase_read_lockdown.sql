-- DMs are read only through the Nest API (DB role bypasses RLS). Supabase JWT clients must not SELECT message bodies.
DROP POLICY IF EXISTS "dm_messages_select_own_thread" ON "dm_messages";--> statement-breakpoint

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE "dm_messages";
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
