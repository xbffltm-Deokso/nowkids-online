'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DepartmentDetail, DepartmentOverview } from '@/types';

const STORAGE_KEY = 'admin.departmentId';

// 관리자 화면의 부서 목록과 선택한 부서 (마지막에 고른 부서를 기억)
export function useDepartments() {
    const [data, setData] = useState<DepartmentOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const reload = useCallback(() => {
        fetch('/api/departments?detail=1')
            .then((r) => {
                if (!r.ok) throw new Error(`요청 실패 (${r.status})`);
                return r.json();
            })
            .then((d: DepartmentOverview) => setData(d))
            .catch((err: Error) => setError(`부서 목록을 불러오지 못했습니다: ${err.message}`));
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    // 학생 출석 부서만 (주일보고만 하는 부서·폐지 부서 제외)
    const schools: DepartmentDetail[] = useMemo(
        () => (data?.departments ?? []).filter((d) => d.kind === 'school' && !d.archived),
        [data]
    );

    useEffect(() => {
        if (schools.length === 0) return;
        if (selectedId && schools.some((d) => d.id === selectedId)) return;
        let saved: string | null = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch {
            // 저장소를 못 쓰는 환경이면 첫 부서
        }
        const initial =
            schools.find((d) => d.id === saved) ??
            [...schools].sort((a, b) => b.activeStudents - a.activeStudents)[0];
        setSelectedId(initial.id);
    }, [schools, selectedId]);

    const select = (id: string) => {
        setSelectedId(id);
        try {
            localStorage.setItem(STORAGE_KEY, id);
        } catch {
            // 무시
        }
    };

    const selected = schools.find((d) => d.id === selectedId) ?? null;

    return { all: data?.departments ?? [], schools, selected, select, reload, error };
}
