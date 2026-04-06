-- Mirrored from apps/api/drizzle/0012_strains_breeders_catalog.sql (Drizzle migration).
CREATE TYPE "public"."catalog_suggestion_kind" AS ENUM('new_strain', 'new_breeder', 'edit_strain', 'edit_breeder');
CREATE TYPE "public"."catalog_suggestion_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TABLE "breeders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"website" text,
	"country" text,
	"published" boolean DEFAULT true NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"avg_rating" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "breeders_slug_unique" UNIQUE("slug")
);
CREATE TABLE "strains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"breeder_id" uuid,
	"effects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"effects_notes" text,
	"published" boolean DEFAULT true NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"avg_rating" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strains_slug_unique" UNIQUE("slug")
);
CREATE TABLE "breeder_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"breeder_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"rating" numeric(3, 2) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_by" uuid,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "breeder_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
);
CREATE TABLE "strain_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strain_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"rating" numeric(3, 2) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_by" uuid,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strain_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
);
CREATE TABLE "catalog_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "catalog_suggestion_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"suggested_by" uuid NOT NULL,
	"status" "catalog_suggestion_status" DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"moderated_at" timestamp with time zone,
	"moderated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "strains" ADD CONSTRAINT "strains_breeder_id_breeders_id_fk" FOREIGN KEY ("breeder_id") REFERENCES "public"."breeders"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "breeder_reviews" ADD CONSTRAINT "breeder_reviews_breeder_id_breeders_id_fk" FOREIGN KEY ("breeder_id") REFERENCES "public"."breeders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "breeder_reviews" ADD CONSTRAINT "breeder_reviews_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "breeder_reviews" ADD CONSTRAINT "breeder_reviews_hidden_by_profiles_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "strain_reviews" ADD CONSTRAINT "strain_reviews_strain_id_strains_id_fk" FOREIGN KEY ("strain_id") REFERENCES "public"."strains"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "strain_reviews" ADD CONSTRAINT "strain_reviews_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "strain_reviews" ADD CONSTRAINT "strain_reviews_hidden_by_profiles_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "catalog_suggestions" ADD CONSTRAINT "catalog_suggestions_suggested_by_profiles_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "catalog_suggestions" ADD CONSTRAINT "catalog_suggestions_moderated_by_profiles_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "breeders_published_name_idx" ON "breeders" USING btree ("published","name");
CREATE INDEX "breeders_slug_idx" ON "breeders" USING btree ("slug");
CREATE INDEX "strains_published_name_idx" ON "strains" USING btree ("published","name");
CREATE INDEX "strains_breeder_idx" ON "strains" USING btree ("breeder_id");
CREATE INDEX "strains_slug_idx" ON "strains" USING btree ("slug");
CREATE UNIQUE INDEX "breeder_reviews_breeder_author_uq" ON "breeder_reviews" USING btree ("breeder_id","author_id");
CREATE INDEX "breeder_reviews_breeder_idx" ON "breeder_reviews" USING btree ("breeder_id");
CREATE UNIQUE INDEX "strain_reviews_strain_author_uq" ON "strain_reviews" USING btree ("strain_id","author_id");
CREATE INDEX "strain_reviews_strain_idx" ON "strain_reviews" USING btree ("strain_id");
CREATE INDEX "catalog_suggestions_status_created_idx" ON "catalog_suggestions" USING btree ("status","created_at");
CREATE INDEX "catalog_suggestions_suggested_by_idx" ON "catalog_suggestions" USING btree ("suggested_by");
