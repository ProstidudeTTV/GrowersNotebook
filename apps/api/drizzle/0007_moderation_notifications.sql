-- User notifications (e.g. moderation) + profile moderation flags
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "banned_at" timestamptz;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "suspended_until" timestamptz;

CREATE TABLE IF NOT EXISTS "user_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_notifications_user_created_idx"
  ON "user_notifications" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "user_notifications_user_unread_idx"
  ON "user_notifications" ("user_id")
  WHERE "read_at" IS NULL;
