import { pgTable, text, integer, boolean, date, timestamp, index, serial, uuid, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';

// ── 조직: 교육부 → 부서 → 학년·반 ─────────────────────────────
// 부서·학년·반은 코드에 넣지 않고 모두 설정으로 관리 (교육1부 개편 예정)

export const divisions = pgTable('divisions', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(), // 교육1부·교육2부
    sortOrder: integer('sort_order').notNull().default(0),
});

export const departments = pgTable(
    'departments',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        divisionId: uuid('division_id')
            .notNull()
            .references(() => divisions.id),
        name: text('name').notNull(),
        kind: text('kind').notNull().default('school'), // 'school' | 'report_only'(학생 없이 주일보고만)
        serviceTime: text('service_time'), // '10시' | '12시'
        ageMin: integer('age_min'),
        ageMax: integer('age_max'),
        sortOrder: integer('sort_order').notNull().default(0),
        ch2chOrgName: text('ch2ch_org_name'), // 예: "[덕소]소년부"
        // 교사용 출석 링크 토큰의 SHA-256 해시 (원문은 저장하지 않음, 교체하면 이전 링크는 즉시 무효)
        linkTokenHash: text('link_token_hash').unique(),
        nextDepartmentId: uuid('next_department_id').references((): AnyPgColumn => departments.id),
        archivedAt: timestamp('archived_at', { withTimezone: true }), // 폐지 부서는 지우지 않고 숨김
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [uniqueIndex('departments_division_name_idx').on(t.divisionId, t.name)]
);

// 학년: 진급 순서와 ch2ch 대응용 (학년이 없는 부서도 있음)
export const grades = pgTable('grades', {
    id: uuid('id').primaryKey().defaultRandom(),
    departmentId: uuid('department_id')
        .notNull()
        .references(() => departments.id),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ch2chSubName: text('ch2ch_sub_name'), // 예: "4학년"
    reportAge: integer('report_age'), // 생년월일이 없을 때 주일보고서 연령으로 쓸 기본값 (세는 나이)
    archivedAt: timestamp('archived_at', { withTimezone: true }),
});

// 반: 교사가 출석을 표시하기 쉽게 묶는 용도일 뿐 (주일보고서와 무관)
export const classes = pgTable('classes', {
    id: uuid('id').primaryKey().defaultRandom(),
    departmentId: uuid('department_id')
        .notNull()
        .references(() => departments.id),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
});

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
        // ── 부서 구조 (이관 중에는 위 grade·classNum과 함께 유지) ──
        departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
        gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
        classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }), // 없으면 반 미배정
        // 교적(ch2ch)에 없어 등록이 필요한 학생 — 교적 동기화가 표시하고 교역자가 직접 켜고 끌 수 있음
        needsRegistration: boolean('needs_registration').notNull().default(false),
        source: text('source'), // 'legacy' | 'import'(교적) | 'link'(교사 새 친구) | 'manual'
    },
    (t) => [
        index('students_grade_class_idx').on(t.grade, t.classNum),
        index('students_department_idx').on(t.departmentId),
    ]
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
        updatedVia: text('updated_via'), // 'link'(교사 링크) | 'staff'(교역자) — 비어 있으면 이전 방식
    },
    (t) => [index('attendance_student_date_idx').on(t.studentId, t.date)]
);

// 출석 변경 기록 — 로그인 없는 교사 링크의 실수·장난을 교역자가 되돌릴 수 있게 모든 변경을 남김
export const attendanceChanges = pgTable(
    'attendance_changes',
    {
        id: serial('id').primaryKey(),
        studentId: text('student_id')
            .notNull()
            .references(() => students.id, { onDelete: 'cascade' }),
        date: date('date').notNull(),
        oldStatus: boolean('old_status'), // null = 기록 없던 상태
        newStatus: boolean('new_status'),
        oldReason: text('old_reason'),
        newReason: text('new_reason'),
        via: text('via').notNull(), // 'link' | 'staff'
        departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('attendance_changes_student_date_idx').on(t.studentId, t.date)]
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
export type DepartmentRow = typeof departments.$inferSelect;
export type AttendanceRow = typeof attendanceRecords.$inferSelect;
