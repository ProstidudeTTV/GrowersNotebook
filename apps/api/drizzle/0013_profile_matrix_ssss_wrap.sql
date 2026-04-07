CREATE TABLE "profile_matrix_ssss_wrap" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"ciphertext" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_matrix_ssss_wrap" ADD CONSTRAINT "profile_matrix_ssss_wrap_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
