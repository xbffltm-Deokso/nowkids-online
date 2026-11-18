import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
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
import { writeAttendance } from '@/lib/attendance-write';

// POST /api/attendance/changes { date, changes: [{ studentId, status, reason }], fillAbsent: [studentId] }
// 기존 교사 화면용 — 바꾼 학생만 저장해 여러 선생님이 동시에 저장해도 서로의 입력을 지우지 않음
export const POST = withErrorHandling(async (req: NextRequest) => {
    const body = asObject(await readJson(req));
    const date = requireDate(body.date, 'date');
    const rawChanges = Array.isArray(body.changes) ? body.changes : [];
    const rawFill = Array.isArray(body.fillAbsent) ? body.fillAbsent : [];
    if (rawChanges.length + rawFill.length > 300) badRequest('한 번에 저장할 수 있는 학생 수를 넘었습니다.');

    const changes = rawChanges.map((raw) => {
        const c = asObject(raw);
        return {
            studentId: requireString(c.studentId, 'studentId'),
            status: requireBoolean(c.status, 'status'),
            reason: optionalString(c.reason, 'reason'),
        };
    });
    const fillAbsent = rawFill.map((id) => requireString(id, 'fillAbsent'));

    const ids = [...new Set([...changes.map((c) => c.studentId), ...fillAbsent])];
    if (ids.length > 0) {
        const found = await db.select({ id: students.id }).from(students).where(inArray(students.id, ids));
        if (found.length !== ids.length) badRequest('존재하지 않는 학생이 포함되어 있습니다.');
    }

    return NextResponse.json(await writeAttendance({ date, changes, fillAbsent, via: 'legacy', departmentId: null }));
});
