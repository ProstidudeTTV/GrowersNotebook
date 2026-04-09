-- Keep in sync with apps/api/drizzle/0021_notebook_setup_fields.sql
DO $t$ BEGIN
  CREATE TYPE "public"."notebook_room_type" AS ENUM('indoor', 'outdoor', 'greenhouse');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $t$;

DO $t$ BEGIN
  CREATE TYPE "public"."notebook_watering_type" AS ENUM('manual', 'drip', 'hydro', 'aeroponic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $t$;

DO $t$ BEGIN
  CREATE TYPE "public"."notebook_start_type" AS ENUM('seed', 'clone', 'seedling');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $t$;

ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "room_type" "notebook_room_type";
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "watering_type" "notebook_watering_type";
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "start_type" "notebook_start_type";
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "setup_notes" text;
