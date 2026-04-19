-- Mirror supabase/migrations/20260522120000_dm_realtime_signals.sql

CREATE TABLE IF NOT EXISTS "dm_realtime_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dm_realtime_signals" ADD CONSTRAINT "dm_realtime_signals_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_realtime_signals" ADD CONSTRAINT "dm_realtime_signals_message_id_dm_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."dm_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_realtime_signals_thread_created_idx" ON "dm_realtime_signals" USING btree ("thread_id","created_at");--> statement-breakpoint
ALTER TABLE "dm_realtime_signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "dm_realtime_signals_select_participant" ON "dm_realtime_signals";--> statement-breakpoint
CREATE POLICY "dm_realtime_signals_select_participant" ON "dm_realtime_signals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM "dm_threads" AS t WHERE t.id = "dm_realtime_signals"."thread_id" AND (t.user_low = auth.uid() OR t.user_high = auth.uid())));
