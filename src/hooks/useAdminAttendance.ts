'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { dataConnect } from '@/lib/firebase';
import { getStudents, getAttendanceHistory } from '@/lib/generated';
import { Student } from '@/types';

export interface AttendanceMatrixRow {
    student: Student;
    records: Record<string, boolean>; // date -> true(출석)/false(결석)
    presentCount: number;
    absentCount: number;
}

export interface UseAdminAttendanceResult {
    students: Student[];
    rows: AttendanceMatrixRow[];
    allDates: string[]; // 기록이 있는 전체 날짜 정렬 목록
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useAdminAttendance(grade: string, classNum: number): UseAdminAttendanceResult {
    const [students, setStudents] = useState<Student[]>([]);
    const [rows, setRows] = useState<AttendanceMatrixRow[]>([]);
    const [allDates, setAllDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!grade) return;
        setLoading(true);
        setError(null);
        try {
            const auth = getAuth();
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }

            const [studentsRes, historyRes] = await Promise.all([
                getStudents(dataConnect, { grade, classNum }),
                getAttendanceHistory(dataConnect, { grade, classNum }),
            ]);

            const fetchedStudents: Student[] = studentsRes.data.students.map((s) => ({
                id: s.id,
                grade: s.grade,
                classNum: s.classNum,
                number: s.number,
                name: s.name,
                gender: s.gender as any,
                status: s.status as any,
            }));

            // studentId -> date -> status 매핑 및 전체 날짜 수집
            const attendanceMap: Record<string, Record<string, boolean>> = {};
            const dateSet = new Set<string>();

            for (const record of historyRes.data.attendanceRecords) {
                const sid = record.student.id;
                if (!attendanceMap[sid]) attendanceMap[sid] = {};
                attendanceMap[sid][record.date] = record.status;
                dateSet.add(record.date);
            }

            const sortedDates = Array.from(dateSet).sort();

            const matrixRows: AttendanceMatrixRow[] = fetchedStudents
                .sort((a, b) => a.number - b.number)
                .map((student) => {
                    const records = attendanceMap[student.id] ?? {};
                    const presentCount = Object.values(records).filter(Boolean).length;
                    const absentCount = Object.values(records).filter((v) => !v).length;
                    return { student, records, presentCount, absentCount };
                });

            setStudents(fetchedStudents);
            setRows(matrixRows);
            setAllDates(sortedDates);
        } catch (err) {
            console.error(err);
            setError('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [grade, classNum]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { students, rows, allDates, loading, error, refresh: fetchData };
}
