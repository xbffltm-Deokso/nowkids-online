import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classes, departments, grades, students } from '@/lib/schema';
import {
    asObject,
    badRequest,
    readJson,
    requireInt,
    requireOneOf,
    requireString,
    withErrorHandling,
} from '@/lib/api-utils';
import { UUID_RE } from '@/lib/department-admin';
import { studentLabelColumns, studentScope, toLabels } from '@/lib/student-scope';

const GENDERS = ['M', 'F'] as const;
const STATUSES = ['재학', '휴학', '전학', '진급', '새친구'] as const;

// GET /api/students?departmentId=&gradeId=&classId= (또는 예전 ?grade=&classNum=)
export const GET = withErrorHandling(async (req: NextRequest) => {
    const rows = await db
        .select({ student: students, ...studentLabelColumns })
        .from(students)
        .leftJoin(grades, eq(grades.id, students.gradeId))
        .leftJoin(classes, eq(classes.id, students.classId))
        .where(studentScope(req.nextUrl.searchParams))
        .orderBy(asc(grades.sortOrder), asc(classes.sortOrder), asc(students.grade), asc(students.classNum), asc(students.number), asc(students.name));

    return NextResponse.json(rows.map(({ student, ...labels }) => ({ ...student, ...toLabels(labels) })));
});

function optionalUuid(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !UUID_RE.test(value)) badRequest(`${field}가 올바르지 않습니다.`);
    return value;
}

// POST /api/students — 학생 추가·수정
// departmentId를 보내면 부서·학년·반으로 저장하고, 예전 학년 문자열·반 번호는 거기서 맞춰 채움
export const POST = withErrorHandling(async (req: NextRequest) => {
    const body = asObject(await readJson(req));

    const base = {
        id: requireString(body.id, 'id'),
        number: requireInt(body.number ?? 0, 'number'),
        name: requireString(body.name, 'name').trim(),
        gender: requireOneOf(body.gender ?? 'M', 'gender', GENDERS),
        status: requireOneOf(body.status ?? '재학', 'status', STATUSES),
    };

    let values;
    const departmentId = optionalUuid(body.departmentId, '부서');
    if (departmentId) {
        const gradeId = optionalUuid(body.gradeId, '학년');
        const classId = optionalUuid(body.classId, '반');
        const [dep] = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, departmentId));
        if (!dep) badRequest('부서를 찾을 수 없습니다.');
        let gradeName: string | null = null;
        if (gradeId) {
            const [g] = await db
                .select({ name: grades.name })
                .from(grades)
                .where(and(eq(grades.id, gradeId), eq(grades.departmentId, departmentId)));
            if (!g) badRequest('이 부서의 학년이 아닙니다.');
            gradeName = g.name;
        }
        let classNum = 0;
        if (classId) {
            const [c] = await db
                .select({ name: classes.name })
                .from(classes)
                .where(and(eq(classes.id, classId), eq(classes.departmentId, departmentId)));
            if (!c) badRequest('이 부서의 반이 아닙니다.');
            classNum = Number(/(\d+)\s*반/.exec(c.name)?.[1] ?? 0);
        }
        values = { ...base, departmentId, gradeId, classId, grade: gradeName ?? dep.name, classNum };
    } else {
        values = {
            ...base,
            grade: requireString(body.grade, 'grade'),
            classNum: requireInt(body.classNum, 'classNum', 1),
        };
    }

    const [row] = await db
        .insert(students)
        .values(values)
        .onConflictDoUpdate({ target: students.id, set: values })
        .returning();

    return NextResponse.json(row);
});
