-- Realtime "pings" for DM delivery without exposing dm_messages via PostgREST/Realtime.
-- Nest inserts rows using DATABASE_URL (bypasses RLS); clients receive postgres_changes on INSERT.

CREATE TABLE IF NOT EXISTS public.dm_realtime_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads (id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.dm_messages (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_realtime_signals_thread_created_idx
  ON public.dm_realtime_signals (thread_id, created_at DESC);

ALTER TABLE public.dm_realtime_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_realtime_signals_select_participant ON public.dm_realtime_signals;
CREATE POLICY dm_realtime_signals_select_participant ON public.dm_realtime_signals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dm_threads AS t
      WHERE t.id = dm_realtime_signals.thread_id
        AND (t.user_low = auth.uid() OR t.user_high = auth.uid())
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_realtime_signals;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
