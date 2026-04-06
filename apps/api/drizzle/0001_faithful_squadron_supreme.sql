-- Idempotent: safe when post_id was added manually or 0001 partially ran before.
ALTER TABLE "comment_votes" ADD COLUMN IF NOT EXISTS "post_id" uuid;
--> statement-breakpoint
UPDATE "comment_votes" AS cv
SET "post_id" = c.post_id
FROM "comments" AS c
WHERE c.id = cv.comment_id
  AND (cv.post_id IS NULL OR cv.post_id <> c.post_id);
--> statement-breakpoint
DELETE FROM "comment_votes" WHERE "post_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "comment_votes" ALTER COLUMN "post_id" SET NOT NULL;
--> statement-breakpoint
DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_votes_post_id_posts_id_fk'
  ) THEN
    ALTER TABLE "comment_votes"
      ADD CONSTRAINT "comment_votes_post_id_posts_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
      ON DELETE CASCADE;
  END IF;
END
$migrate$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_votes_post_idx" ON "comment_votes" USING btree ("post_id");
