'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student } from '@/types';
import { fetchStudents, saveStudentApi } from '@/lib/api-client';

export interface UseStudentManagementResult {
    students: Student[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    saveStudent: (data: Omit<Student, 'id'> & { id?: string }) => Promise<void>;
    deactivateStudent: (student: Student) => Promise<void>;
}

export function useStudentManagement(grade?: string, classNum?: number): UseStudentManagementResult {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const allStudents =
                grade && classNum
                    ? await fetchStudents(grade, classNum)
                    : await fetchStudents('all', 0);

            setStudents(
                allStudents.sort((a, b) => {
                    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
                    if (a.classNum !== b.classNum) return a.classNum - b.classNum;
                    return a.number - b.number;
                })
            );
        } catch (err: any) {
            const msg = err?.message || String(err);
            setError(`데이터 로드 실패: ${msg}`);
            console.error('[useStudentManagement]', err);
        } finally {
            setLoading(false);
        }
    }, [grade, classNum]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const saveStudent = async (data: Omit<Student, 'id'> & { id?: string }) => {
        // 새 학생 ID는 UUID — 이름·번호로 만들면 동명이인이 기존 학생을 덮어씀
        const id = data.id || crypto.randomUUID();
        await saveStudentApi({ ...data, id });
        await fetchData();
    };

    const deactivateStudent = async (student: Student) => {
        await saveStudentApi({ ...student, status: '전학' });
        await fetchData();
    };

    return { students, loading, error, refresh: fetchData, saveStudent, deactivateStudent };
}
