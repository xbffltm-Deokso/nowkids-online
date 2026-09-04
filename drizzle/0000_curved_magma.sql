CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"date" date NOT NULL,
	"status" boolean NOT NULL,
	"reason" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"grade" text NOT NULL,
	"class_num" integer NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_student_date_idx" ON "attendance_records" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "students_grade_class_idx" ON "students" USING btree ("grade","class_num");