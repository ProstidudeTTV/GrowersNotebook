CREATE TABLE "dm_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_low" uuid NOT NULL,
	"user_high" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone,
	CONSTRAINT "dm_threads_order_chk" CHECK ("user_low" < "user_high")
);
--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_thread_reads" (
	"thread_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dm_thread_reads_thread_id_profile_id_pk" PRIMARY KEY("thread_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_user_low_profiles_id_fk" FOREIGN KEY ("user_low") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_user_high_profiles_id_fk" FOREIGN KEY ("user_high") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_thread_reads" ADD CONSTRAINT "dm_thread_reads_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_thread_reads" ADD CONSTRAINT "dm_thread_reads_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dm_threads_pair_uq" ON "dm_threads" USING btree ("user_low","user_high");--> statement-breakpoint
CREATE INDEX "dm_threads_last_msg_idx" ON "dm_threads" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "dm_messages_thread_created_idx" ON "dm_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
DROP TABLE IF EXISTS "profile_matrix_ssss_wrap";--> statement-breakpoint

ALTER TABLE "dm_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dm_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dm_thread_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "dm_threads_select_own" ON "dm_threads" FOR SELECT TO "authenticated" USING (auth.uid() = "user_low" OR auth.uid() = "user_high");--> statement-breakpoint
CREATE POLICY "dm_messages_select_own_thread" ON "dm_messages" FOR SELECT TO "authenticated" USING (
	EXISTS (
		SELECT 1 FROM "dm_threads" t
		WHERE t.id = "dm_messages"."thread_id"
		AND (t."user_low" = auth.uid() OR t."user_high" = auth.uid())
	)
);--> statement-breakpoint
CREATE POLICY "dm_thread_reads_select_own" ON "dm_thread_reads" FOR SELECT TO "authenticated" USING ("profile_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "dm_thread_reads_insert_own" ON "dm_thread_reads" FOR INSERT TO "authenticated" WITH CHECK ("profile_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "dm_thread_reads_update_own" ON "dm_thread_reads" FOR UPDATE TO "authenticated" USING ("profile_id" = auth.uid()) WITH CHECK ("profile_id" = auth.uid());--> statement-breakpoint

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "dm_messages";
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
