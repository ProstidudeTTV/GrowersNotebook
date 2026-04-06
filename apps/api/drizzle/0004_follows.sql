-- Idempotent: safe if supabase/migrations mirror was applied first, or on re-run.
CREATE TABLE IF NOT EXISTS "community_follows" (
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_follows_user_id_community_id_pk" PRIMARY KEY("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "user_follows_no_self" CHECK (follower_id <> following_id)
);
--> statement-breakpoint
DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_follows_user_id_profiles_id_fk'
  ) THEN
    ALTER TABLE "community_follows"
      ADD CONSTRAINT "community_follows_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_follows_community_id_communities_id_fk'
  ) THEN
    ALTER TABLE "community_follows"
      ADD CONSTRAINT "community_follows_community_id_communities_id_fk"
      FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_follower_id_profiles_id_fk'
  ) THEN
    ALTER TABLE "user_follows"
      ADD CONSTRAINT "user_follows_follower_id_profiles_id_fk"
      FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_following_id_profiles_id_fk'
  ) THEN
    ALTER TABLE "user_follows"
      ADD CONSTRAINT "user_follows_following_id_profiles_id_fk"
      FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END
$migrate$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_follows_community_idx" ON "community_follows" USING btree ("community_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_follows_following_idx" ON "user_follows" USING btree ("following_id");
