ALTER TABLE "dm_messages" ADD COLUMN IF NOT EXISTS "image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "dm_messages" SET "image_urls" = jsonb_build_array("image_url") WHERE "image_url" IS NOT NULL AND trim("image_url") <> '' AND COALESCE(jsonb_array_length("image_urls"), 0) = 0;--> statement-breakpoint
