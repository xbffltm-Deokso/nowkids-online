'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import {
    fetchStudents,
    fetchAttendance,
    saveStudentApi,
    saveAttendanceApi,
} from '@/lib/api-client';

export function useAttendance(grade: string, classNum: number, date: string) {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
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

            // 전학 처리된 학생은 출석 대상에서 제외 (기록은 DB에 그대로 보존)
            const sorted = studentsData
                .filter((s) => s.status !== '전학')
                .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
            setStudents(sorted);

            const activeIds = new Set(sorted.map((s) => s.id));
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
            const msg = err?.message || String(err);
            if (!isSilent) setError(`데이터 로드 실패: ${msg}`);
            console.error('[useAttendance]', err);
        } finally {
            if (!isSilent) setLoading(false);
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

    const saveAttendance = async () => {
        try {
            const records = Object.values(attendance).map((r) => ({
                id: r.id || `${r.studentId}_${date}`,
                studentId: r.studentId,
                date,
                status: r.status,
                reason: r.reason || undefined,
            }));
            await saveAttendanceApi(records);
            alert('저장되었습니다.');
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
