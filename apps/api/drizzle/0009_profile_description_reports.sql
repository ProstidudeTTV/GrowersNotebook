-- Public profile bio + user reports for moderators.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "description" text;

CREATE TABLE IF NOT EXISTS "profile_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reported_user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "reporter_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "profile_reports_no_self" CHECK ("reporter_id" <> "reported_user_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "profile_reports_reported_reporter_uq"
  ON "profile_reports" ("reported_user_id", "reporter_id");

CREATE INDEX IF NOT EXISTS "profile_reports_created_idx"
  ON "profile_reports" ("created_at");
