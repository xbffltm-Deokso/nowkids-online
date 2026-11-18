import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, gte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceRecords, students } from '@/lib/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { studentScope } from '@/lib/student-scope';
import {
    asList,
    asObject,
    optionalString,
    readJson,
    requireBoolean,
    requireDate,
    requireString,
    withErrorHandling,
} from '@/lib/api-utils';

// GET /api/attendance?departmentId=&gradeId=&classId=&date=&from= (또는 예전 ?grade=&classNum=)
// date를 생략하면 해당 학년/반의 전체 출석 이력을 반환, from을 주면 그 날짜 이후만 반환
export const GET = withErrorHandling(async (req: NextRequest) => {
    const params = req.nextUrl.searchParams;
    const date = params.get('date');
    const from = params.get('from');

    // 부서(학년·반) 또는 예전 학년 문자열·반 번호 범위
    const scope = studentScope(params);
    const conditions = scope ? [scope] : [];
    if (date) {
        conditions.push(eq(attendanceRecords.date, requireDate(date, 'date')));
    }
    if (from) {
        conditions.push(gte(attendanceRecords.date, requireDate(from, 'from')));
    }

    const rows = await db
        .select({
            id: attendanceRecords.id,
            studentId: attendanceRecords.studentId,
            studentName: students.name,
            date: attendanceRecords.date,
            status: attendanceRecords.status,
            reason: attendanceRecords.reason,
            timestamp: attendanceRecords.timestamp,
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(attendanceRecords.date), asc(students.classNum), asc(students.number));

    return NextResponse.json(rows);
});

// POST /api/attendance — 단건 또는 배열 배치 upsert
// 기록 ID는 항상 `${studentId}_${date}` (같은 학생·날짜에 기록이 하나만 생기도록 서버에서 결정)
export const POST = withErrorHandling(async (req: NextRequest) => {
    const list = asList(await readJson(req));

    if (list.length === 0) {
        return NextResponse.json([]);
    }

    const values = list.map((raw) => {
        const item = asObject(raw);
        const studentId = requireString(item.studentId, 'studentId');
        const date = requireDate(item.date, 'date');
        return {
            id: `${studentId}_${date}`,
            studentId,
            date,
            status: requireBoolean(item.status, 'status'),
            reason: optionalString(item.reason, 'reason'),
        };
    });

    const rows = await db
        .insert(attendanceRecords)
        .values(values)
        .onConflictDoUpdate({
            target: attendanceRecords.id,
            set: {
                status: sql`excluded.status`,
                reason: sql`excluded.reason`,
                timestamp: sql`now()`,
            },
        })
        .returning();

    return NextResponse.json(rows);
});

// DELETE /api/attendance — [{ studentId, date }] 배열로 받은 기록 삭제 ("기록 없음"으로 되돌리기)
export const DELETE = withErrorHandling(async (req: NextRequest) => {
    await requireAdmin(req);
    const list = asList(await readJson(req));

    if (list.length === 0) {
        return NextResponse.json([]);
    }

    const targets = list.map((raw) => {
        const item = asObject(raw);
        return and(
            eq(attendanceRecords.studentId, requireString(item.studentId, 'studentId')),
            eq(attendanceRecords.date, requireDate(item.date, 'date'))
        );
    });

    const rows = await db
        .delete(attendanceRecords)
        .where(or(...targets))
        .returning();

    return NextResponse.json(rows);
});
