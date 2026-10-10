import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte, inArray, like, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceRecords, students } from '@/lib/schema';
import { badRequest, requireDate, withErrorHandling } from '@/lib/api-utils';

// ch2ch 출석부(분기) 화면에서 실행되는 북마클릿(public/ch2ch-sync.js)이 호출하는 조회 API
// GET /api/ch2ch?grade=4&from=2026-10-01&to=2026-12-31
// grade는 학년 숫자 — "4.믿음"처럼 해당 숫자로 시작하는 학년 전체(모든 반)를 대상으로 함
const CH2CH_ORIGIN = 'https://ch2ch.or.kr';

function withCors(res: NextResponse): NextResponse {
    res.headers.set('Access-Control-Allow-Origin', CH2CH_ORIGIN);
    res.headers.set('Vary', 'Origin');
    return res;
}

const handler = withErrorHandling(async (req: NextRequest) => {
    const params = req.nextUrl.searchParams;
    const grade = params.get('grade') ?? '';
    if (!/^\d$/.test(grade)) {
        badRequest('grade는 학년 숫자(예: 4)여야 합니다.');
    }
    const from = requireDate(params.get('from'), 'from');
    const to = requireDate(params.get('to'), 'to');

    const gradeCondition = like(students.grade, `${grade}.%`);

    const [studentRows, records] = await Promise.all([
        db
            .select({ name: students.name })
            .from(students)
            .where(and(gradeCondition, inArray(students.status, ['재학', '휴학'])))
            .orderBy(asc(students.name)),
        db
            .select({
                name: students.name,
                date: attendanceRecords.date,
                status: attendanceRecords.status,
            })
            .from(attendanceRecords)
            .innerJoin(students, eq(attendanceRecords.studentId, students.id))
            .where(and(gradeCondition, gte(attendanceRecords.date, from), lte(attendanceRecords.date, to))),
    ]);

    return NextResponse.json({ students: studentRows.map((s) => s.name), records });
});

export async function GET(req: NextRequest) {
    return withCors(await handler(req));
}
