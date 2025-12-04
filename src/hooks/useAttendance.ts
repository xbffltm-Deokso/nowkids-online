'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import { api } from '@/lib/api';
import { MOCK_STUDENTS, MOCK_ATTENDANCE, delay } from '@/lib/mock';

export function useAttendance(grade: string, classNum: number, date: string) {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // API 호출 시도 (실패 시 Mock 데이터 사용)
            // 실제 환경에서는 API만 호출해야 함
            try {
                const [studentsData, attendanceData] = await Promise.all([
                    api.getStudents({ grade, classNum }),
                    api.getAttendance({ date, grade, classNum }),
                ]);

                setStudents(studentsData);
                const attendanceMap = attendanceData.reduce((acc, record) => {
                    acc[record.studentId] = record;
                    return acc;
                }, {} as Record<string, AttendanceRecord>);
                setAttendance(attendanceMap);
            } catch (e) {
                console.warn('API fetch failed, using mock data', e);
                await delay(500); // 로딩 시뮬레이션
                setStudents(MOCK_STUDENTS);

                const mockMap = MOCK_ATTENDANCE.reduce((acc, record) => {
                    acc[record.studentId] = record;
                    return acc;
                }, {} as Record<string, AttendanceRecord>);
                setAttendance(mockMap);
            }
        } catch (err) {
            setError('데이터를 불러오는데 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [grade, classNum, date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateStatus = (studentId: string, newStatus: AttendanceStatus) => {
        const student = students.find(s => s.id === studentId);
        setAttendance((prev: Record<string, AttendanceRecord>) => ({
            ...prev,
            [studentId]: {
                id: prev[studentId]?.id || `new-${Date.now()}`,
                studentId,
                studentName: student?.name,
                date,
                status: newStatus,
                timestamp: new Date().toISOString(),
            },
        }));
    };

    const saveAttendance = async () => {
        try {
            const records = Object.values(attendance) as AttendanceRecord[];
            await api.submitAttendance({ date, records });
            alert('저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 실패 (Mock 모드에서는 콘솔 확인)');
        }
    };

    return {
        students,
        attendance,
        loading,
        error,
        updateStatus,
        saveAttendance,
        refresh: fetchData,
    };
}
