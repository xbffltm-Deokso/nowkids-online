'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import {
    fetchStudents,
    fetchAttendance,
    saveStudentApi,
    deleteStudentApi,
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

            const sorted = [...studentsData].sort((a, b) =>
                a.name.localeCompare(b.name, 'ko-KR')
            );
            setStudents(sorted);

            const attendanceMap: Record<string, AttendanceRecord> = {};
            for (const record of attendanceData) {
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
        const newId = `student_${Date.now()}`;

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

    const removeStudent = async (studentId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setAttendance((prev) => {
            const next = { ...prev };
            delete next[studentId];
            return next;
        });

        try {
            await deleteStudentApi(studentId);
            fetchData(true);
        } catch (e) {
            console.error(e);
            alert('학생 삭제 실패');
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
