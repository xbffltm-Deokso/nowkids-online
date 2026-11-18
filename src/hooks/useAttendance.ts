'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import {
    fetchStudents,
    fetchAttendance,
    saveStudentApi,
    saveAttendanceChangesApi,
} from '@/lib/api-client';
import { isActiveStatus } from '@/utils/studentStatus';

export function useAttendance(grade: string, classNum: number, date: string) {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // 학년/반을 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 최신 요청만 반영
    const latestRequestRef = useRef(0);
    // DB에 저장되어 있던 값 — 저장할 때 바꾼 학생만 보내기 위해 비교용으로 보관
    const storedRef = useRef<Record<string, { status: boolean; reason: string }>>({});

    const fetchData = useCallback(async (isSilent = false) => {
        const requestId = ++latestRequestRef.current;
        if (!grade) {
            if (!isSilent) setLoading(false);
            return;
        }
        if (!isSilent) {
            setLoading(true);
            setError(null);
        }
        try {
            const [studentsData, attendanceData] = await Promise.all([
                fetchStudents(grade, classNum),
                fetchAttendance(grade, classNum, { date }),
            ]);
            if (requestId !== latestRequestRef.current) return;

            // 전학 처리된 학생은 출석 대상에서 제외 (기록은 DB에 그대로 보존)
            const sorted = studentsData
                .filter((s) => isActiveStatus(s.status))
                .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
            setStudents(sorted);

            const activeIds = new Set(sorted.map((s) => s.id));
            storedRef.current = Object.fromEntries(
                attendanceData.map((r) => [r.studentId, { status: r.status, reason: r.reason ?? '' }])
            );
            const attendanceMap: Record<string, AttendanceRecord> = {};
            for (const record of attendanceData) {
                if (!activeIds.has(record.studentId)) continue;
                attendanceMap[record.studentId] = {
                    ...record,
                    reason: record.reason ?? '',
                };
            }

            // 기록이 없는 학생은 기본값(결석)으로 채움
            for (const s of sorted) {
                if (!attendanceMap[s.id]) {
                    attendanceMap[s.id] = {
                        id: `${s.id}_${date}`,
                        studentId: s.id,
                        studentName: s.name,
                        date,
                        status: false,
                        reason: '',
                        timestamp: new Date().toISOString(),
                    };
                }
            }

            setAttendance(attendanceMap);
        } catch (err: any) {
            if (requestId !== latestRequestRef.current) return;
            const msg = err?.message || String(err);
            if (!isSilent) setError(`데이터 로드 실패: ${msg}`);
            console.error('[useAttendance]', err);
        } finally {
            if (requestId === latestRequestRef.current) setLoading(false);
        }
    }, [grade, classNum, date]);

    useEffect(() => {
        fetchData(false);
    }, [fetchData]);

    const updateStatus = (studentId: string, newStatus: AttendanceStatus) => {
        const student = students.find((s) => s.id === studentId);
        setAttendance((prev) => ({
            ...prev,
            [studentId]: {
                id: prev[studentId]?.id || `${studentId}_${date}`,
                studentId,
                studentName: student?.name,
                date,
                status: newStatus,
                // 출석(TRUE)으로 변경 시 사유(reason) 초기화
                reason: newStatus ? '' : prev[studentId]?.reason,
                timestamp: new Date().toISOString(),
            },
        }));
    };

    const updateReason = (studentId: string, newReason: string) => {
        setAttendance((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                reason: newReason,
                timestamp: new Date().toISOString(),
            },
        }));
    };

    // 바꾼 학생만 저장하고, 기록이 없던 학생은 결석으로 채움(그사이 다른 선생님이 저장했으면 그대로 둠)
    const saveAttendance = async () => {
        try {
            const stored = storedRef.current;
            const changes: { studentId: string; status: boolean; reason: string | null }[] = [];
            const fillAbsent: string[] = [];
            for (const r of Object.values(attendance)) {
                const before = stored[r.studentId];
                const reason = r.status ? '' : r.reason || '';
                const differs = before
                    ? before.status !== r.status || before.reason !== reason
                    : r.status || reason !== '';
                if (differs) changes.push({ studentId: r.studentId, status: r.status, reason: reason || null });
                else if (!before) fillAbsent.push(r.studentId);
            }
            await saveAttendanceChangesApi(date, changes, fillAbsent);
            alert('저장되었습니다.');
            fetchData(true);
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        }
    };

    const addStudent = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const newId = crypto.randomUUID();

        const newStudent: Student = {
            id: newId,
            grade,
            classNum,
            number: 0,
            name: trimmed,
            gender: 'M',
            status: '재학',
        };

        // 낙관적 업데이트
        setStudents((prev) =>
            [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
        );
        setAttendance((prev) => ({
            ...prev,
            [newId]: {
                id: `${newId}_${date}`,
                studentId: newId,
                studentName: trimmed,
                date,
                status: false,
                reason: '',
                timestamp: new Date().toISOString(),
            },
        }));

        try {
            await saveStudentApi(newStudent);
            fetchData(true);
        } catch (e) {
            console.error(e);
            alert('학생 추가 실패');
            fetchData(true);
        }
    };

    // 실제 삭제 대신 '전학' 처리 — 출석 기록은 보존되고, 관리자 화면에서 재학으로 되돌릴 수 있음
    const removeStudent = async (studentId: string) => {
        const student = students.find((s) => s.id === studentId);
        if (!student) return;
        if (!confirm(`${student.name} 학생을 목록에서 제외(전학 처리)하시겠습니까?
출석 기록은 보존되며, 관리자 화면에서 되돌릴 수 있습니다.`)) return;

        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setAttendance((prev) => {
            const next = { ...prev };
            delete next[studentId];
            return next;
        });

        try {
            await saveStudentApi({ ...student, status: '전학' });
            fetchData(true);
        } catch (e) {
            console.error(e);
            alert('학생 제외 실패');
            fetchData(true);
        }
    };

    return {
        students,
        attendance,
        loading,
        error,
        updateStatus,
        updateReason,
        saveAttendance,
        addStudent,
        removeStudent,
        refresh: fetchData,
    };
}
