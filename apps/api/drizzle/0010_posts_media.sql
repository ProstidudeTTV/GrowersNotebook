ALTER TABLE "posts" ADD COLUMN "media" jsonb DEFAULT '[]'::jsonb NOT NULL;
