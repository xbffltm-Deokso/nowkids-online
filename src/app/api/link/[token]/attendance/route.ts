import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { students } from '@/lib/schema';
import {
    asObject,
    badRequest,
    optionalString,
    readJson,
    requireBoolean,
    requireDate,
    requireString,
    withErrorHandling,
} from '@/lib/api-utils';
import { departmentFromToken } from '@/lib/department-link';
import { writeAttendance } from '@/lib/attendance-write';

// POST /api/link/[token]/attendance
// { date, changes: [{ studentId, status, reason }], fillAbsent: [studentId] }
// changes = 교사가 바꾼 학생만, fillAbsent = 화면의 반에서 아직 기록이 없는 학생(결석으로 채움, 이미 있으면 그대로)
const MAX_STUDENTS = 300;

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const dep = await departmentFromToken(token);
    const body = asObject(await readJson(req));
    const date = requireDate(body.date, 'date');

    const rawChanges = Array.isArray(body.changes) ? body.changes : [];
    const rawFill = Array.isArray(body.fillAbsent) ? body.fillAbsent : [];
    if (rawChanges.length + rawFill.length > MAX_STUDENTS) badRequest('한 번에 저장할 수 있는 학생 수를 넘었습니다.');

    const changes = rawChanges.map((raw) => {
        const c = asObject(raw);
        return {
            studentId: requireString(c.studentId, 'studentId'),
            status: requireBoolean(c.status, 'status'),
            reason: optionalString(c.reason, 'reason'),
        };
    });
    const fillAbsent = rawFill.map((id) => requireString(id, 'fillAbsent'));

    // 모든 학생이 이 링크의 부서 소속인지 서버에서 확인
    const ids = [...new Set([...changes.map((c) => c.studentId), ...fillAbsent])];
    if (ids.length > 0) {
        const owned = await db
            .select({ id: students.id })
            .from(students)
            .where(and(eq(students.departmentId, dep.id), inArray(students.id, ids)));
        if (owned.length !== ids.length) badRequest('이 부서 학생이 아닌 학생이 포함되어 있습니다.');
    }

    const result = await writeAttendance({ date, changes, fillAbsent, via: 'link', departmentId: dep.id });
    return NextResponse.json(result);
});
