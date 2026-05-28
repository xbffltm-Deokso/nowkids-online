'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { dataConnect } from '@/lib/firebase';
import { getStudents, upsertStudent } from '@/lib/generated';
import { Student } from '@/types';

const ALL_GRADES = ['4.믿음', '5.소망', '6.사랑'];
const ALL_CLASSES = [1, 2, 3, 4];

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
            const auth = getAuth();
            if (!auth.currentUser) await signInAnonymously(auth);

            let allStudents: Student[];

            if (grade && classNum) {
                const res = await getStudents(dataConnect, { grade, classNum });
                allStudents = res.data.students.map(mapStudent);
            } else {
                const combos = ALL_GRADES.flatMap((g) => ALL_CLASSES.map((c) => ({ g, c })));
                const results = await Promise.all(
                    combos.map(({ g, c }) => getStudents(dataConnect, { grade: g, classNum: c }))
                );
                allStudents = results.flatMap((r) => r.data.students.map(mapStudent));
            }

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

    const ensureAuth = async () => {
        const auth = getAuth();
        if (!auth.currentUser) await signInAnonymously(auth);
    };

    const saveStudent = async (data: Omit<Student, 'id'> & { id?: string }) => {
        await ensureAuth();
        const id =
            data.id ||
            `${data.grade}_${data.classNum}_${data.number}_${data.name.replace(/\s+/g, '')}`;
        await upsertStudent(dataConnect, {
            id,
            grade: data.grade,
            classNum: data.classNum,
            number: data.number,
            name: data.name,
            gender: data.gender,
            status: data.status,
        });
        await fetchData();
    };

    const deactivateStudent = async (student: Student) => {
        await ensureAuth();
        await upsertStudent(dataConnect, {
            id: student.id,
            grade: student.grade,
            classNum: student.classNum,
            number: student.number,
            name: student.name,
            gender: student.gender,
            status: '전학',
        });
        await fetchData();
    };

    return { students, loading, error, refresh: fetchData, saveStudent, deactivateStudent };
}

function mapStudent(s: {
    id: string;
    grade: string;
    classNum: number;
    number: number;
    name: string;
    gender: string;
    status: string;
}): Student {
    return {
        id: s.id,
        grade: s.grade,
        classNum: s.classNum,
        number: s.number,
        name: s.name,
        gender: s.gender as Student['gender'],
        status: s.status as Student['status'],
    };
}
