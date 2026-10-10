import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, gte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceRecords, students } from '@/lib/schema';

// GET /api/attendance?grade=&classNum=&date=&from=
// date를 생략하면 해당 학년/반의 전체 출석 이력을 반환, from을 주면 그 날짜 이후만 반환
export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const grade = params.get('grade');
    const classNum = params.get('classNum');
    const date = params.get('date');
    const from = params.get('from');

    if (!grade) {
        return NextResponse.json({ error: 'grade는 필수입니다.' }, { status: 400 });
    }

    // grade=all 이면 전 학년, classNum=0 이면 전체 반
    const conditions = [];
    if (grade !== 'all') {
        conditions.push(eq(students.grade, grade));
    }
    if (classNum !== null && classNum !== '0') {
        const parsed = Number(classNum);
        if (Number.isNaN(parsed)) {
            return NextResponse.json({ error: 'classNum이 올바르지 않습니다.' }, { status: 400 });
        }
        conditions.push(eq(students.classNum, parsed));
    }
    if (date) {
        conditions.push(eq(attendanceRecords.date, date));
    }
    if (from) {
        conditions.push(gte(attendanceRecords.date, from));
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
}

// POST /api/attendance — 단건 또는 배열 배치 upsert
export async function POST(req: NextRequest) {
    const body = await req.json();
    const list = Array.isArray(body) ? body : [body];

    if (list.length === 0) {
        return NextResponse.json([]);
    }

    const values = [];
    for (const item of list) {
        const { id, studentId, date, status, reason } = item ?? {};
        if (!studentId || !date) {
            return NextResponse.json(
                { error: 'studentId와 date는 필수입니다.' },
                { status: 400 }
            );
        }
        values.push({
            id: String(id || `${studentId}_${date}`),
            studentId: String(studentId),
            date: String(date),
            status: Boolean(status),
            reason: reason ? String(reason) : null,
        });
    }

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
}

// DELETE /api/attendance — [{ studentId, date }] 배열로 받은 기록 삭제 ("기록 없음"으로 되돌리기)
export async function DELETE(req: NextRequest) {
    const body = await req.json();
    const list = Array.isArray(body) ? body : [body];

    const targets = [];
    for (const item of list) {
        const { studentId, date } = item ?? {};
        if (!studentId || !date) {
            return NextResponse.json(
                { error: 'studentId와 date는 필수입니다.' },
                { status: 400 }
            );
        }
        targets.push(
            and(eq(attendanceRecords.studentId, String(studentId)), eq(attendanceRecords.date, String(date)))
        );
    }

    if (targets.length === 0) {
        return NextResponse.json([]);
    }

    const rows = await db
        .delete(attendanceRecords)
        .where(or(...targets))
        .returning();

    return NextResponse.json(rows);
}
