'use client';

import { useEffect, useState } from 'react';
import { AttendanceSummary, AttendanceSummaryResult } from '@/types';
import { fetchAttendanceGroups } from '@/lib/api-client';

// 학생별 52주 출석 그룹 — studentId로 바로 찾을 수 있게 Map으로도 제공
export function useAttendanceGroups() {
    const [result, setResult] = useState<AttendanceSummaryResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;
        fetchAttendanceGroups()
            .then((data) => {
                if (!ignore) setResult(data);
            })
            .catch((err: Error) => {
                if (!ignore) setError(`출석 그룹 로드 실패: ${err.message}`);
            });
        return () => {
            ignore = true;
        };
    }, []);

    const byStudent = new Map<string, AttendanceSummary>(
        (result?.summaries ?? []).map((s) => [s.studentId, s])
    );

    return { result, byStudent, error, loading: !result && !error };
}
