import { and, gte, lte, min } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceRecords, students } from '@/lib/schema';
import { addWeeks, getSundayOfCurrentWeek } from '@/utils/dateUtils';
import { AttendanceGroup, AttendanceSummary, AttendanceSummaryResult } from '@/types';
import { isActiveStatus } from '@/utils/studentStatus';

// 최근 52주 출석률과 출석 그룹(A~E) 계산 — 화면(/api/attendance-groups)과 진급자 DB 추출이 함께 사용
export const GROUP_WINDOW_WEEKS = 52;
// 기록 인원이 재적의 절반 미만인 주는 출석부를 덜 쓴 주로 보고 집계에서 제외 (출석 통계 화면과 같은 기준)
const LOW_RECORD_RATIO = 0.5;

// A 80% 이상, B 60% 이상, C 40% 이상, D 20% 이상, E 20% 미만
export function groupOf(rate: number): AttendanceGroup {
    if (rate >= 80) return 'A';
    if (rate >= 60) return 'B';
    if (rate >= 40) return 'C';
    if (rate >= 20) return 'D';
    return 'E';
}

function isSunday(date: string): boolean {
    return new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
}

export async function computeAttendanceSummaries(to = getSundayOfCurrentWeek()): Promise<AttendanceSummaryResult> {
    const from = addWeeks(to, -(GROUP_WINDOW_WEEKS - 1));

    const [studentRows, records, firstDates] = await Promise.all([
        db.select({ id: students.id, status: students.status }).from(students),
        db
            .select({ studentId: attendanceRecords.studentId, date: attendanceRecords.date, status: attendanceRecords.status })
            .from(attendanceRecords)
            .where(and(gte(attendanceRecords.date, from), lte(attendanceRecords.date, to))),
        db
            .select({ studentId: attendanceRecords.studentId, first: min(attendanceRecords.date) })
            .from(attendanceRecords)
            .groupBy(attendanceRecords.studentId),
    ]);

    const activeCount = studentRows.filter((s) => isActiveStatus(s.status)).length;

    // 출석부를 쓴 주일 (토요일 등 일요일이 아닌 중복 기록 제외)
    const recordsPerDate = new Map<string, number>();
    const presentSet = new Set<string>();
    for (const r of records) {
        if (!isSunday(r.date)) continue;
        recordsPerDate.set(r.date, (recordsPerDate.get(r.date) ?? 0) + 1);
        if (r.status) presentSet.add(`${r.studentId}|${r.date}`);
    }
    const countedWeeks = Array.from(recordsPerDate.entries())
        .filter(([, n]) => n >= activeCount * LOW_RECORD_RATIO)
        .map(([date]) => date)
        .sort();

    const firstDateOf = new Map(firstDates.map((f) => [f.studentId, f.first]));

    const summaries = studentRows.map((s): AttendanceSummary => {
        const first = firstDateOf.get(s.id);
        const weeks = first ? countedWeeks.filter((d) => d >= first) : [];
        const present = weeks.filter((d) => presentSet.has(`${s.id}|${d}`)).length;
        let absentStreak = 0;
        for (let i = weeks.length - 1; i >= 0 && !presentSet.has(`${s.id}|${weeks[i]}`); i--) {
            absentStreak++;
        }
        const rate = weeks.length > 0 ? Math.round((present / weeks.length) * 1000) / 10 : null;
        return {
            studentId: s.id,
            present,
            weeks: weeks.length,
            rate,
            group: rate === null ? null : groupOf(rate),
            absentStreak,
        };
    });

    return { from, to, countedWeeks: countedWeeks.length, summaries };
}
