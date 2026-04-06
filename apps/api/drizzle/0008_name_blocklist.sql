-- Substrings that must not appear in display names or community names (NFKC lowercase, trimmed terms).
CREATE TABLE IF NOT EXISTS "name_blocklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "term" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "name_blocklist_term_unique"
  ON "name_blocklist" ("term");
