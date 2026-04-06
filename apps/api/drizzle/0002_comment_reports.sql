CREATE TABLE IF NOT EXISTS "comment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_reports_comment_id_comments_id_fk'
  ) THEN
    ALTER TABLE "comment_reports"
      ADD CONSTRAINT "comment_reports_comment_id_comments_id_fk"
      FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_reports_post_id_posts_id_fk'
  ) THEN
    ALTER TABLE "comment_reports"
      ADD CONSTRAINT "comment_reports_post_id_posts_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_reports_reporter_id_profiles_id_fk'
  ) THEN
    ALTER TABLE "comment_reports"
      ADD CONSTRAINT "comment_reports_reporter_id_profiles_id_fk"
      FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END
$migrate$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reports_post_idx" ON "comment_reports" USING btree ("post_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comment_reports_comment_reporter_uq" ON "comment_reports" USING btree ("comment_id","reporter_id");
