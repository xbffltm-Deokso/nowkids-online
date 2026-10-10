CREATE TABLE "admin_auth_failures" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_auth_failures_created_idx" ON "admin_auth_failures" USING btree ("created_at");