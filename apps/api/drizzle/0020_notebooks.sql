-- NOTEBOOK grow-diary + nutrient catalog + profile privacy flag (idempotent for Drizzle migrate on Render if Supabase migration already ran)
DO $t$ BEGIN
  CREATE TYPE "public"."notebook_status" AS ENUM('active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $t$;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "show_notebooks_public" boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS "notebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"strain_id" uuid,
	"custom_strain_label" text,
	"title" text NOT NULL,
	"status" "notebook_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"plant_count" integer,
	"total_light_watts" numeric(12, 2),
	"harvest_dry_weight_g" numeric(12, 3),
	"harvest_quality_notes" text,
	"g_per_watt" numeric(14, 6),
	"g_per_watt_per_plant" numeric(14, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notebook_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"week_index" integer NOT NULL,
	"notes" text,
	"temp_c" numeric(6, 2),
	"humidity_pct" numeric(6, 2),
	"ph" numeric(5, 2),
	"ec" numeric(8, 3),
	"light_cycle" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notebook_weeks_notebook_week_uq" UNIQUE("notebook_id","week_index")
);

CREATE TABLE IF NOT EXISTS "nutrient_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"npk" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notebook_week_nutrients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"product_id" uuid,
	"custom_label" text,
	"dosage" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "notebook_votes" (
	"user_id" uuid NOT NULL,
	"notebook_id" uuid NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "notebook_votes_user_id_notebook_id_pk" PRIMARY KEY("user_id","notebook_id")
);

CREATE TABLE IF NOT EXISTS "notebook_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $fk$ BEGIN
  ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_strain_id_strains_id_fk" FOREIGN KEY ("strain_id") REFERENCES "public"."strains"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_weeks" ADD CONSTRAINT "notebook_weeks_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_week_nutrients" ADD CONSTRAINT "notebook_week_nutrients_week_id_notebook_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."notebook_weeks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_week_nutrients" ADD CONSTRAINT "notebook_week_nutrients_product_id_nutrient_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."nutrient_products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_votes" ADD CONSTRAINT "notebook_votes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_votes" ADD CONSTRAINT "notebook_votes_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_comments" ADD CONSTRAINT "notebook_comments_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_comments" ADD CONSTRAINT "notebook_comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

DO $fk$ BEGIN
  ALTER TABLE "notebook_comments" ADD CONSTRAINT "notebook_comments_parent_id_notebook_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."notebook_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $fk$;

CREATE INDEX IF NOT EXISTS "notebooks_owner_updated_idx" ON "notebooks" USING btree ("owner_id","updated_at");
CREATE INDEX IF NOT EXISTS "notebooks_strain_idx" ON "notebooks" USING btree ("strain_id");
CREATE INDEX IF NOT EXISTS "notebook_weeks_notebook_idx" ON "notebook_weeks" USING btree ("notebook_id");
CREATE INDEX IF NOT EXISTS "nutrient_products_published_name_idx" ON "nutrient_products" USING btree ("published","name");
CREATE INDEX IF NOT EXISTS "notebook_week_nutrients_week_idx" ON "notebook_week_nutrients" USING btree ("week_id");
CREATE INDEX IF NOT EXISTS "notebook_votes_notebook_idx" ON "notebook_votes" USING btree ("notebook_id");
CREATE INDEX IF NOT EXISTS "notebook_comments_notebook_created_idx" ON "notebook_comments" USING btree ("notebook_id","created_at");
CREATE INDEX IF NOT EXISTS "notebook_comments_parent_idx" ON "notebook_comments" USING btree ("parent_id");
