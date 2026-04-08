-- Messenger-mode DMs (Drizzle 0014_dm_messenger). Plaintext in Postgres; operator/backend can read content (like default Messenger).
-- Drops legacy Matrix secret-storage wrap table.

DROP TABLE IF EXISTS public.profile_matrix_ssss_wrap;

CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_low uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT dm_threads_order_chk CHECK (user_low < user_high)
);

CREATE UNIQUE INDEX dm_threads_pair_uq ON public.dm_threads (user_low, user_high);
CREATE INDEX dm_threads_last_msg_idx ON public.dm_threads (last_message_at);

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.dm_threads (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dm_messages_thread_created_idx ON public.dm_messages (thread_id, created_at);

CREATE TABLE public.dm_thread_reads (
  thread_id uuid NOT NULL REFERENCES public.dm_threads (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, profile_id)
);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_threads_select_own ON public.dm_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_low OR auth.uid() = user_high);

CREATE POLICY dm_messages_select_own_thread ON public.dm_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = dm_messages.thread_id
        AND (t.user_low = auth.uid() OR t.user_high = auth.uid())
    )
  );

CREATE POLICY dm_thread_reads_select_own ON public.dm_thread_reads
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY dm_thread_reads_insert_own ON public.dm_thread_reads
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY dm_thread_reads_update_own ON public.dm_thread_reads
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
