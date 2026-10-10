import { pgTable, text, integer, boolean, date, timestamp, index, serial } from 'drizzle-orm/pg-core';

export const students = pgTable(
    'students',
    {
        id: text('id').primaryKey(),
        grade: text('grade').notNull(),
        classNum: integer('class_num').notNull(),
        number: integer('number').notNull(),
        name: text('name').notNull(),
        gender: text('gender').notNull(),
        status: text('status').notNull(),
    },
    (t) => [index('students_grade_class_idx').on(t.grade, t.classNum)]
);

export const attendanceRecords = pgTable(
    'attendance_records',
    {
        id: text('id').primaryKey(),
        studentId: text('student_id')
            .notNull()
            .references(() => students.id, { onDelete: 'cascade' }),
        date: date('date').notNull(),
        status: boolean('status').notNull(),
        reason: text('reason'),
        timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('attendance_student_date_idx').on(t.studentId, t.date)]
);

// 관리자 비밀번호 실패 기록 — 비밀번호 대입(brute force) 차단용
export const adminAuthFailures = pgTable(
    'admin_auth_failures',
    {
        id: serial('id').primaryKey(),
        ip: text('ip').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('admin_auth_failures_created_idx').on(t.createdAt)]
);

export type StudentRow = typeof students.$inferSelect;
export type AttendanceRow = typeof attendanceRecords.$inferSelect;
