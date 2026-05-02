'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, Gender, StudentStatus } from '@/types';
import { getStudents, getAttendanceByDate, upsertAttendance } from '@/lib/generated';
import { dataConnect } from '@/lib/firebase';
import { signInAnonymously, getAuth } from 'firebase/auth';

export function useAttendance(grade: string, classNum: number, date: string) {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Firebase 익명 로그인 (Data Connect USER 권한 요구사항 우회용)
            const auth = getAuth();
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }

            // Firebase Data Connect API 호출
            const [studentsRes, attendanceRes] = await Promise.all([
                getStudents(dataConnect, { grade, classNum }),
                getAttendanceByDate(dataConnect, { 
                    date: new Date(date).toISOString().split('T')[0], // Date 타입 포맷 맞춤
                    grade, 
                    classNum 
                }),
            ]);

            const studentsData = studentsRes.data.students;
            const attendanceData = attendanceRes.data.attendanceRecords;

            const studentsWithIds: Student[] = studentsData.map((s) => ({
                id: s.id,
                grade: s.grade,
                classNum: s.classNum,
                number: s.number,
                name: s.name,
                gender: s.gender as Gender,
                status: s.status as StudentStatus,
            }));

            setStudents(studentsWithIds);
            
            const attendanceMap = attendanceData.reduce((acc, record) => {
                if (record.student.id) {
                    acc[record.student.id] = {
                        id: record.id,
                        studentId: record.student.id,
                        studentName: record.student.name,
                        date: record.date,
                        status: record.status,
                        reason: record.reason ?? '',
                        timestamp: record.timestamp,
                    };
                }
                return acc;
            }, {} as Record<string, AttendanceRecord>);

            // 학생 목록을 기준으로 attendanceMap 보완 (기록이 없는 학생들을 위해)
            studentsWithIds.forEach((s) => {
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
            });

            setAttendance(attendanceMap);
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
        const student = students.find((s: Student) => s.id === studentId);
        setAttendance((prev: Record<string, AttendanceRecord>) => ({
            ...prev,
            [studentId]: {
                id: prev[studentId]?.id || `new-${Date.now()}`,
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
        setAttendance((prev: Record<string, AttendanceRecord>) => ({
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
            const records = Object.values(attendance) as AttendanceRecord[];
            
            // 모든 레코드에 대해 upsert 실행
            await Promise.all(records.map(record => 
                upsertAttendance(dataConnect, {
                    id: record.id || `${record.studentId}_${date}`,
                    studentId: record.studentId,
                    date: new Date(date).toISOString().split('T')[0],
                    status: record.status,
                    reason: record.reason || null
                })
            ));

            alert('저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 실패');
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
        refresh: fetchData,
    };
}
