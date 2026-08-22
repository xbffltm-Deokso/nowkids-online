'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { dataConnect } from '@/lib/firebase';
import { getStudents, getAttendanceHistory, upsertAttendance } from '@/lib/generated';
import { Student } from '@/types';

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
    saveBatchAttendance: (changes: Record<string, { status: boolean; reason?: string | null }>) => Promise<boolean>;
}

const ALL_GRADES = ['4.믿음', '5.소망', '6.사랑'];
const ALL_CLASSES = [1, 2, 3, 4];

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

            const gradeList = grade === 'all' ? ALL_GRADES : [grade];
            const classList = classNum === 0 ? ALL_CLASSES : [classNum];

            const combinations: { grade: string; classNum: number }[] = [];
            for (const g of gradeList) {
                for (const c of classList) {
                    combinations.push({ grade: g, classNum: c });
                }
            }

            const studentsResults = [];
            const historyResults = [];
            
            // 24개 병렬 요청이 한 번에 스파이크를 발생시켜 Too many connections 에러가 나므로 조합별 순차(Sequential) 실행으로 커넥션 슬롯을 방어
            for (const comb of combinations) {
                const [sRes, hRes] = await Promise.all([
                    getStudents(dataConnect, { grade: comb.grade, classNum: comb.classNum }),
                    getAttendanceHistory(dataConnect, { grade: comb.grade, classNum: comb.classNum })
                ]);
                studentsResults.push(sRes);
                historyResults.push(hRes);
            }

            const fetchedStudents: Student[] = studentsResults.flatMap((res) =>
                res.data.students.map((s) => ({
                    id: s.id,
                    grade: s.grade,
                    classNum: s.classNum,
                    number: s.number,
                    name: s.name,
                    gender: s.gender as any,
                    status: s.status as any,
                }))
            );

            // studentId -> date -> status 매핑 및 전체 날짜 수집
            const attendanceMap: Record<string, Record<string, { status: boolean; reason?: string | null }>> = {};
            const dateSet = new Set<string>();

            for (const historyRes of historyResults) {
                for (const record of historyRes.data.attendanceRecords) {
                    const sid = record.student.id;
                    if (!attendanceMap[sid]) attendanceMap[sid] = {};
                    attendanceMap[sid][record.date] = {
                        status: record.status,
                        reason: record.reason,
                    };
                    dateSet.add(record.date);
                }
            }

            const sortedDates = Array.from(dateSet).sort();

            const matrixRows: AttendanceMatrixRow[] = fetchedStudents
                .sort((a, b) => {
                    if (a.grade !== b.grade) {
                        return a.grade.localeCompare(b.grade);
                    }
                    if (a.classNum !== b.classNum) {
                        return a.classNum - b.classNum;
                    }
                    return a.number - b.number;
                })
                .map((student) => {
                    const records = attendanceMap[student.id] ?? {};
                    const presentCount = Object.values(records).filter((v) => v.status).length;
                    const absentCount = Object.values(records).filter((v) => !v.status).length;
                    return { student, records, presentCount, absentCount };
                });

            setStudents(fetchedStudents);
            setRows(matrixRows);
            setAllDates(sortedDates);
        } catch (err: any) {
            const msg = err?.message || String(err);
            setError(`데이터 로드 실패: ${msg}`);
            console.error('[useAdminAttendance]', err);
        } finally {
            setLoading(false);
        }
    }, [grade, classNum]);

    const saveBatchAttendance = useCallback(async (
        changes: Record<string, { status: boolean; reason?: string | null }>
    ) => {
        setLoading(true);
        setError(null);
        try {
            const auth = getAuth();
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }

            const entries = Object.entries(changes);
            
            // 24개 스파이크 방어를 위해 순차 실행
            for (const [key, val] of entries) {
                const [studentId, date] = key.split('_');
                // status가 undefined/null인 경우(미기록 전환) DB 삭제를 지원하지 않으므로 skip
                if (!studentId || !date || val.status === undefined || val.status === null) continue;
                
                await upsertAttendance(dataConnect, {
                    id: `${studentId}_${date}`,
                    studentId,
                    date,
                    status: val.status,
                    reason: val.reason || null
                });
            }
            
            await fetchData();
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
