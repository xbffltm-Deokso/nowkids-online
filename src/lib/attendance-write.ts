import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceChanges, attendanceRecords } from '@/lib/schema';

// 출석 저장 공통 로직 — "바꾼 학생만 저장" + 변경 기록
// - changes: 사용자가 실제로 바꾼 학생 → 그 값으로 저장 (같은 학생을 둘이 고치면 나중 저장이 이김)
// - fillAbsent: 아직 기록이 없는 학생 → 결석으로 채우되, 그사이 다른 사람이 저장했으면 덮어쓰지 않음

export interface AttendanceChangeInput {
    studentId: string;
    status: boolean;
    reason: string | null;
}

export async function writeAttendance(opts: {
    date: string;
    changes: AttendanceChangeInput[];
    fillAbsent: string[];
    via: 'link' | 'staff' | 'legacy';
    departmentId: string | null;
}): Promise<{ saved: number; filled: number }> {
    const { date, changes, fillAbsent, via, departmentId } = opts;
    const ids = [...new Set([...changes.map((c) => c.studentId), ...fillAbsent])];
    if (ids.length === 0) return { saved: 0, filled: 0 };

    const before = await db
        .select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status, reason: attendanceRecords.reason })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.date, date), inArray(attendanceRecords.studentId, ids)));
    const prev = new Map(before.map((r) => [r.studentId, r]));

    const changed = changes.filter((c) => {
        const p = prev.get(c.studentId);
        return !p || p.status !== c.status || (p.reason ?? null) !== c.reason;
    });
    const changedIds = new Set(changes.map((c) => c.studentId));
    const toFill = fillAbsent.filter((id) => !changedIds.has(id) && !prev.has(id));

    const queries = [];
    if (changed.length > 0) {
        queries.push(
            db
                .insert(attendanceRecords)
                .values(changed.map((c) => ({
                    id: `${c.studentId}_${date}`,
                    studentId: c.studentId,
                    date,
                    status: c.status,
                    reason: c.status ? null : c.reason,
                    updatedVia: via,
                })))
                .onConflictDoUpdate({
                    target: attendanceRecords.id,
                    set: {
                        status: sql`excluded.status`,
                        reason: sql`excluded.reason`,
                        updatedVia: sql`excluded.updated_via`,
                        timestamp: sql`now()`,
                    },
                })
        );
        queries.push(
            db.insert(attendanceChanges).values(changed.map((c) => ({
                studentId: c.studentId,
                date,
                oldStatus: prev.get(c.studentId)?.status ?? null,
                newStatus: c.status,
                oldReason: prev.get(c.studentId)?.reason ?? null,
                newReason: c.status ? null : c.reason,
                via,
                departmentId,
            })))
        );
    }
    if (toFill.length > 0) {
        // 다른 사람이 먼저 저장한 기록은 건드리지 않음
        queries.push(
            db
                .insert(attendanceRecords)
                .values(toFill.map((id) => ({ id: `${id}_${date}`, studentId: id, date, status: false, updatedVia: via })))
                .onConflictDoNothing({ target: attendanceRecords.id })
        );
    }
    if (queries.length > 0) {
        await db.batch(queries as [typeof queries[number], ...typeof queries]);
    }
    return { saved: changed.length, filled: toFill.length };
}
