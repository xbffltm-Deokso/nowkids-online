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

// 학생 개인정보 — students와 분리해 둔 별도 테이블
// 관리자 비밀번호가 필요한 /api/admin/* 라우트 외에는 절대 조회하지 않음 (화면·일반 API에 노출 금지)
export const studentPrivate = pgTable('student_private', {
    studentId: text('student_id')
        .primaryKey()
        .references(() => students.id, { onDelete: 'cascade' }),
    teacher: text('teacher'),
    birthDate: date('birth_date'),
    phone: text('phone'),
    motherName: text('mother_name'),
    motherPhone: text('mother_phone'),
    fatherName: text('father_name'),
    fatherPhone: text('father_phone'),
    address: text('address'),
    note: text('note'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 관리자 작업 기록 (개인정보 가져오기·추출, 진급 처리) — 개인정보 값은 남기지 않고 요약만 저장
export const adminLogs = pgTable(
    'admin_logs',
    {
        id: serial('id').primaryKey(),
        action: text('action').notNull(), // 'import' | 'export' | 'promote'
        summary: text('summary').notNull(),
        count: integer('count').notNull(),
        ip: text('ip').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('admin_logs_action_created_idx').on(t.action, t.createdAt)]
);

export type StudentRow = typeof students.$inferSelect;
export type AttendanceRow = typeof attendanceRecords.$inferSelect;
