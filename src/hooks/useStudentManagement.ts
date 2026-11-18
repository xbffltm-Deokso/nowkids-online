'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Student, StudentScope } from '@/types';
import { fetchStudentsIn, saveStudentApi } from '@/lib/api-client';

// 학생 추가·수정 입력 — 부서·학년·반은 id로
export interface StudentInput {
    id?: string;
    departmentId: string;
    gradeId: string | null;
    classId: string | null;
    number: number;
    name: string;
    gender: Student['gender'];
    status: Student['status'];
}

export interface UseStudentManagementResult {
    students: Student[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    saveStudent: (data: StudentInput) => Promise<void>;
    deactivateStudent: (student: Student) => Promise<void>;
}

export function useStudentManagement(scope: StudentScope | null): UseStudentManagementResult {
    const departmentId = scope?.departmentId;
    const gradeId = scope?.gradeId;
    const classId = scope?.classId;
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 최신 요청만 반영
    const latestRequestRef = useRef(0);

    const fetchData = useCallback(async () => {
        if (!departmentId) return;
        const requestId = ++latestRequestRef.current;
        setLoading(true);
        setError(null);
        try {
            const allStudents = await fetchStudentsIn({ departmentId, gradeId, classId });
            if (requestId !== latestRequestRef.current) return;

            setStudents(
                allStudents.sort(
                    (a, b) =>
                        (a.order ?? 0) - (b.order ?? 0) || a.number - b.number || a.name.localeCompare(b.name, 'ko-KR')
                )
            );
        } catch (err: any) {
            if (requestId !== latestRequestRef.current) return;
            const msg = err?.message || String(err);
            setError(`데이터 로드 실패: ${msg}`);
            console.error('[useStudentManagement]', err);
        } finally {
            if (requestId === latestRequestRef.current) setLoading(false);
        }
    }, [departmentId, gradeId, classId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const saveStudent = async (data: StudentInput) => {
        // 새 학생 ID는 UUID — 이름·번호로 만들면 동명이인이 기존 학생을 덮어씀
        const id = data.id || crypto.randomUUID();
        await saveStudentApi({ ...data, id });
        await fetchData();
    };

    const deactivateStudent = async (student: Student) => {
        await saveStudentApi({
            id: student.id,
            name: student.name,
            number: student.number,
            gender: student.gender,
            departmentId: student.departmentId,
            gradeId: student.gradeId,
            classId: student.classId,
            grade: student.grade,
            classNum: student.classNum,
            status: '전학',
        });
        await fetchData();
    };

    return { students, loading, error, refresh: fetchData, saveStudent, deactivateStudent };
}
