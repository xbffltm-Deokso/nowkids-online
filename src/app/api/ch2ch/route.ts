import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte, inArray, isNotNull, isNull, like, lte, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceRecords, departments, grades, students } from '@/lib/schema';
import { ApiError, badRequest, requireDate, withErrorHandling } from '@/lib/api-utils';
import { ACTIVE_STATUSES } from '@/utils/studentStatus';

// ch2ch 출석부(분기) 화면에서 실행되는 북마클릿(public/ch2ch-sync.js)이 호출하는 조회 API
// GET /api/ch2ch?orgs=1                          — ch2ch 기관명이 등록된 부서 목록 (북마클릿이 화면의 기관을 찾는 데 씀)
// GET /api/ch2ch?org=[덕소]소년부&sub=4학년&from=…&to=…  — 그 부서(학년)의 학생 이름과 출석 기록
//     sub가 부서의 학년(ch2ch 하위 이름)과 맞으면 그 학년만, 비었거나 학년이 없는 부서면 부서 전체
// GET /api/ch2ch?grade=4&from=…&to=…              — 예전 북마클릿 호환 (소년부 학년 숫자)
const CH2CH_ORIGIN = 'https://ch2ch.or.kr';

function withCors(res: NextResponse): NextResponse {
    res.headers.set('Access-Control-Allow-Origin', CH2CH_ORIGIN);
    res.headers.set('Vary', 'Origin');
    return res;
}

const handler = withErrorHandling(async (req: NextRequest) => {
    const params = req.nextUrl.searchParams;

    if (params.get('orgs') === '1') {
        const rows = await db
            .select({ name: departments.name, org: departments.ch2chOrgName })
            .from(departments)
            .where(and(isNotNull(departments.ch2chOrgName), isNull(departments.archivedAt), eq(departments.kind, 'school')))
            .orderBy(asc(departments.sortOrder));
        return NextResponse.json(rows);
    }

    const from = requireDate(params.get('from'), 'from');
    const to = requireDate(params.get('to'), 'to');

    let condition: SQL;
    let label: string;
    const org = params.get('org');
    if (org) {
        const [dep] = await db
            .select({ id: departments.id, name: departments.name })
            .from(departments)
            .where(and(eq(departments.ch2chOrgName, org), isNull(departments.archivedAt)));
        if (!dep) throw new ApiError(404, `ch2ch 기관 "${org}"과 연결된 부서가 없습니다. Admin 부서 관리에서 ch2ch 기관명을 넣어 주세요.`);
        label = dep.name;
        condition = eq(students.departmentId, dep.id);

        const sub = (params.get('sub') ?? '').trim();
        if (sub) {
            const [grade] = await db
                .select({ id: grades.id, name: grades.name })
                .from(grades)
                .where(and(eq(grades.departmentId, dep.id), eq(grades.ch2chSubName, sub), isNull(grades.archivedAt)));
            if (grade) {
                condition = and(condition, eq(students.gradeId, grade.id))!;
                label = `${dep.name} ${grade.name}`;
            }
        }
    } else {
        const grade = params.get('grade') ?? '';
        if (!/^\d$/.test(grade)) badRequest('org(ch2ch 기관명) 또는 grade(학년 숫자)가 필요합니다.');
        condition = like(students.grade, `${grade}.%`);
        label = `${grade}학년`;
    }

    const [studentRows, records] = await Promise.all([
        db
            .select({ name: students.name })
            .from(students)
            .where(and(condition, inArray(students.status, ACTIVE_STATUSES)))
            .orderBy(asc(students.name)),
        db
            .select({
                name: students.name,
                date: attendanceRecords.date,
                status: attendanceRecords.status,
            })
            .from(attendanceRecords)
            .innerJoin(students, eq(attendanceRecords.studentId, students.id))
            .where(and(condition, gte(attendanceRecords.date, from), lte(attendanceRecords.date, to))),
    ]);

    return NextResponse.json({ department: label, students: studentRows.map((s) => s.name), records });
});

export async function GET(req: NextRequest) {
    return withCors(await handler(req));
}
