import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceRecords, classes, students } from '@/lib/schema';
import { requireDate, withErrorHandling } from '@/lib/api-utils';
import { departmentFromToken } from '@/lib/department-link';
import { getSundayOfCurrentWeek } from '@/utils/dateUtils';

// GET /api/link/[token]?date=YYYY-MM-DD — 교사 출석부: 그 부서의 반·학생(이름만)·그날 출석
// 개인정보(생년월일·연락처 등)는 돌려주지 않음
const ACTIVE = ['재학', '휴학', '새친구'];

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const dep = await departmentFromToken(token);
    const dateParam = req.nextUrl.searchParams.get('date');
    const date = dateParam ? requireDate(dateParam, 'date') : getSundayOfCurrentWeek();

    const [classRows, studentRows] = await Promise.all([
        db
            .select({ id: classes.id, name: classes.name })
            .from(classes)
            .where(and(eq(classes.departmentId, dep.id), isNull(classes.archivedAt)))
            .orderBy(asc(classes.sortOrder), asc(classes.name)),
        db
            .select({ id: students.id, name: students.name, classId: students.classId, status: students.status })
            .from(students)
            .where(and(eq(students.departmentId, dep.id), inArray(students.status, ACTIVE)))
            .orderBy(asc(students.name)),
    ]);

    const records = studentRows.length
        ? await db
            .select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status, reason: attendanceRecords.reason })
            .from(attendanceRecords)
            .where(and(eq(attendanceRecords.date, date), inArray(attendanceRecords.studentId, studentRows.map((s) => s.id))))
        : [];

    const res = NextResponse.json({
        department: { name: dep.name },
        date,
        defaultDate: getSundayOfCurrentWeek(),
        classes: classRows,
        students: studentRows,
        attendance: Object.fromEntries(records.map((r) => [r.studentId, { status: r.status, reason: r.reason }])),
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
});
