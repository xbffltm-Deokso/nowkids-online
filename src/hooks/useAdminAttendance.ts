'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student } from '@/types';
import { fetchStudents, fetchAttendance, saveAttendanceApi } from '@/lib/api-client';

export interface AttendanceMatrixRow {
    student: Student;
    records: Record<string, { status: boolean; reason?: string | null }>; // date -> { status, reason }
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
    saveBatchAttendance: (changes: Record<string, { studentId: string; date: string; status: boolean; reason?: string | null }>) => Promise<boolean>;
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
            // grade='all', classNum=0 은 API가 전 학년/전체 반으로 처리
            const [fetchedStudents, records] = await Promise.all([
                fetchStudents(grade, classNum),
                fetchAttendance(grade, classNum),
            ]);

            const attendanceMap: Record<string, Record<string, { status: boolean; reason?: string | null }>> = {};
            const dateSet = new Set<string>();

            for (const record of records) {
                if (!attendanceMap[record.studentId]) attendanceMap[record.studentId] = {};
                attendanceMap[record.studentId][record.date] = {
                    status: record.status,
                    reason: record.reason,
                };
                dateSet.add(record.date);
            }

            const matrixRows: AttendanceMatrixRow[] = [...fetchedStudents]
                .sort((a, b) => {
                    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
                    if (a.classNum !== b.classNum) return a.classNum - b.classNum;
                    return a.name.localeCompare(b.name, 'ko-KR');
                })
                .map((student) => {
                    const records = attendanceMap[student.id] ?? {};
                    const presentCount = Object.values(records).filter((v) => v.status).length;
                    const absentCount = Object.values(records).filter((v) => !v.status).length;
                    return { student, records, presentCount, absentCount };
                });

            setStudents(fetchedStudents);
            setRows(matrixRows);
            setAllDates(Array.from(dateSet).sort());
        } catch (err: any) {
            const msg = err?.message || String(err);
            setError(`데이터 로드 실패: ${msg}`);
            console.error('[useAdminAttendance]', err);
        } finally {
            setLoading(false);
        }
    }, [grade, classNum]);

    const saveBatchAttendance = useCallback(async (
        changes: Record<string, { studentId: string; date: string; status: boolean; reason?: string | null }>
    ) => {
        setLoading(true);
        setError(null);
        try {
            const entries = Object.entries(changes);
            const payload = entries
                .map(([, v]) => v)
                .filter((v) => v.studentId && v.date && v.status !== undefined && v.status !== null)
                .map((v) => ({
                    id: `${v.studentId}_${v.date}`,
                    studentId: v.studentId,
                    date: v.date,
                    status: v.status,
                    reason: v.reason || undefined,
                }));

            if (payload.length > 0) {
                await saveAttendanceApi(payload);
            }

            // 전체 갱신 전 즉시 반영 (Optimistic Update)
            setRows((prevRows) => prevRows.map((row) => {
                let rowChanged = false;
                const newRecords = { ...row.records };
                for (const v of payload) {
                    if (v.studentId === row.student.id) {
                        newRecords[v.date] = { status: v.status, reason: v.reason || null };
                        rowChanged = true;
                    }
                }
                if (!rowChanged) return row;

                const presentCount = Object.values(newRecords).filter((v) => v.status).length;
                const absentCount = Object.values(newRecords).filter((v) => !v.status).length;
                return { ...row, records: newRecords, presentCount, absentCount };
            }));

            fetchData();
            return true;
        } catch (err: any) {
            const msg = err?.message || String(err);
            setError(`일괄 저장 실패: ${msg}`);
            console.error('[saveBatchAttendance]', err);
            return false;
        } finally {
            setLoading(false);
        }
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { students, rows, allDates, loading, error, refresh: fetchData, saveBatchAttendance };
}
