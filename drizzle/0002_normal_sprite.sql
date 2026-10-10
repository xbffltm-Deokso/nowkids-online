CREATE TABLE "admin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"count" integer NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_private" (
	"student_id" text PRIMARY KEY NOT NULL,
	"teacher" text,
	"birth_date" date,
	"phone" text,
	"mother_name" text,
	"mother_phone" text,
	"father_name" text,
	"father_phone" text,
	"address" text,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_private" ADD CONSTRAINT "student_private_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_logs_action_created_idx" ON "admin_logs" USING btree ("action","created_at");