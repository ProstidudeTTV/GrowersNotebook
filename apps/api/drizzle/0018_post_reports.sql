CREATE TABLE IF NOT EXISTS "post_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_reports_post_id_posts_id_fk'
  ) THEN
    ALTER TABLE "post_reports"
      ADD CONSTRAINT "post_reports_post_id_posts_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_reports_reporter_id_profiles_id_fk'
  ) THEN
    ALTER TABLE "post_reports"
      ADD CONSTRAINT "post_reports_reporter_id_profiles_id_fk"
      FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END
$migrate$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_reports_created_idx" ON "post_reports" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_reports_post_reporter_uq" ON "post_reports" USING btree ("post_id","reporter_id");
