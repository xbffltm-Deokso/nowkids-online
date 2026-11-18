'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Student, StudentScope } from '@/types';
import { fetchStudentsIn, fetchAttendanceIn, saveAttendanceApi, deleteAttendanceApi } from '@/lib/api-client';

export interface AttendanceMatrixRow {
    student: Student;
    records: Record<string, { status: boolean; reason?: string | null }>; // date -> { status, reason }
    presentCount: number;
    absentCount: number;
}

// status가 undefined면 "기록 없음" — 기존 기록을 삭제
export interface AttendanceChange {
    studentId: string;
    date: string;
    status: boolean | undefined;
    reason?: string | null;
}

export interface UseAdminAttendanceResult {
    students: Student[];
    rows: AttendanceMatrixRow[];
    allDates: string[]; // 기록이 있는 전체 날짜 정렬 목록
    loading: boolean;
    error: string | null;
    refresh: () => void;
    saveBatchAttendance: (changes: Record<string, AttendanceChange>, adminPassword?: string) => Promise<boolean>;
}

// scope가 null이면(부서 목록을 아직 못 불러옴) 아무것도 불러오지 않음
export function useAdminAttendance(scope: StudentScope | null): UseAdminAttendanceResult {
    const departmentId = scope?.departmentId;
    const gradeId = scope?.gradeId;
    const classId = scope?.classId;
    const [students, setStudents] = useState<Student[]>([]);
    const [rows, setRows] = useState<AttendanceMatrixRow[]>([]);
    const [allDates, setAllDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // 학년/반을 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 최신 요청만 반영
    const latestRequestRef = useRef(0);

    // isSilent: 저장 후 갱신처럼 화면(필터·스크롤)을 유지한 채 백그라운드로 다시 불러올 때
    const fetchData = useCallback(async (isSilent = false) => {
        if (!departmentId) return;
        const target = { departmentId, gradeId, classId };
        const requestId = ++latestRequestRef.current;
        if (!isSilent) {
            setLoading(true);
            setError(null);
        }
        try {
            const [fetchedStudents, records] = await Promise.all([
                fetchStudentsIn(target),
                fetchAttendanceIn(target),
            ]);
            if (requestId !== latestRequestRef.current) return;

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
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'ko-KR'))
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
            if (requestId !== latestRequestRef.current) return;
            const msg = err?.message || String(err);
            setError(`데이터 로드 실패: ${msg}`);
            console.error('[useAdminAttendance]', err);
        } finally {
            if (requestId === latestRequestRef.current) setLoading(false);
        }
    }, [departmentId, gradeId, classId]);

    // adminPassword: 삭제("기록 없음")가 포함된 경우에만 필요
    const saveBatchAttendance = useCallback(async (changes: Record<string, AttendanceChange>, adminPassword?: string) => {
        // 저장 중 표시는 AttendanceMatrix의 isSaving이 담당 — 여기서 loading을 켜면 매트릭스가 언마운트되어 필터가 초기화됨
        setError(null);
        try {
            const values = Object.values(changes).filter((v) => v.studentId && v.date);
            const payload = values.flatMap((v) =>
                v.status === undefined
                    ? []
                    : [{
                        id: `${v.studentId}_${v.date}`,
                        studentId: v.studentId,
                        date: v.date,
                        status: v.status,
                        reason: v.reason || undefined,
                    }]
            );
            const removals = values
                .filter((v) => v.status === undefined)
                .map((v) => ({ studentId: v.studentId, date: v.date }));

            // 삭제(비밀번호 확인)를 먼저 — 비밀번호가 틀리면 아무것도 저장하지 않고 중단
            if (removals.length > 0) {
                await deleteAttendanceApi(removals, adminPassword ?? '');
            }
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
                for (const v of removals) {
                    if (v.studentId === row.student.id) {
                        delete newRecords[v.date];
                        rowChanged = true;
                    }
                }
                if (!rowChanged) return row;

                const presentCount = Object.values(newRecords).filter((v) => v.status).length;
                const absentCount = Object.values(newRecords).filter((v) => !v.status).length;
                return { ...row, records: newRecords, presentCount, absentCount };
            }));

            fetchData(true);
            return true;
        } catch (err: any) {
            const msg = err?.message || String(err);
            setError(`일괄 저장 실패: ${msg}`);
            console.error('[saveBatchAttendance]', err);
            return false;
        }
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { students, rows, allDates, loading, error, refresh, saveBatchAttendance };
}
