CREATE TABLE "attendance_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"date" date NOT NULL,
	"old_status" boolean,
	"new_status" boolean,
	"old_reason" text,
	"new_reason" text,
	"via" text NOT NULL,
	"department_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'school' NOT NULL,
	"service_time" text,
	"age_min" integer,
	"age_max" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"ch2ch_org_name" text,
	"link_token_hash" text,
	"next_department_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_link_token_hash_unique" UNIQUE("link_token_hash")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "divisions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"ch2ch_sub_name" text,
	"report_age" integer,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "updated_via" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "grade_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "class_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "needs_registration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "attendance_changes" ADD CONSTRAINT "attendance_changes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_changes" ADD CONSTRAINT "attendance_changes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_next_department_id_departments_id_fk" FOREIGN KEY ("next_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_changes_student_date_idx" ON "attendance_changes" USING btree ("student_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_division_name_idx" ON "departments" USING btree ("division_id","name");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "students_department_idx" ON "students" USING btree ("department_id");