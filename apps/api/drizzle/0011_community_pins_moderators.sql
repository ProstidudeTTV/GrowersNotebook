CREATE TABLE "community_moderators" (
	"community_id" uuid NOT NULL,
	"moderator_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_moderators_community_id_moderator_id_pk" PRIMARY KEY("community_id","moderator_id")
);
--> statement-breakpoint
ALTER TABLE "community_moderators" ADD CONSTRAINT "community_moderators_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_moderators" ADD CONSTRAINT "community_moderators_moderator_id_profiles_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_moderators_user_idx" ON "community_moderators" USING btree ("moderator_id");
--> statement-breakpoint
CREATE TABLE "community_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pinned_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_pins" ADD CONSTRAINT "community_pins_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_pins" ADD CONSTRAINT "community_pins_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_pins" ADD CONSTRAINT "community_pins_pinned_by_profiles_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "community_pins_community_post_uq" ON "community_pins" USING btree ("community_id","post_id");
--> statement-breakpoint
CREATE INDEX "community_pins_community_idx" ON "community_pins" USING btree ("community_id");
