'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, Gender, StudentStatus } from '@/types';
import { getStudents, getAttendanceByDate, upsertAttendance, upsertStudent, deleteStudent } from '@/lib/generated';
import { dataConnect } from '@/lib/firebase';
import { signInAnonymously, getAuth } from 'firebase/auth';

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
        if (!isSilent) setLoading(true);
        if (!isSilent) setError(null);
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
            })).sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

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

    const addStudent = async (name: string) => {
        if (!name.trim()) return;
        const newId = `student_${Date.now()}`;
        
        // 1. 낙관적 업데이트 (Optimistic UI) - 즉각 화면 반영
        const newStudent: Student = {
            id: newId,
            grade,
            classNum,
            number: 0,
            name: name.trim(),
            gender: 'M',
            status: '재학'
        };
        
        setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR')));
        setAttendance(prev => ({
            ...prev,
            [newId]: {
                id: `${newId}_${date}`,
                studentId: newId,
                studentName: name.trim(),
                date,
                status: false,
                reason: '',
                timestamp: new Date().toISOString(),
            }
        }));

        try {
            // 2. 서버 반영
            await upsertStudent(dataConnect, {
                id: newId,
                grade,
                classNum,
                number: 0,
                name: name.trim(),
                gender: 'M',
                status: '재학'
            });
            fetchData(true); // 조용히 백그라운드 갱신
        } catch (e) {
            console.error(e);
            alert('학생 추가 실패');
            fetchData(true); // 실패 시 롤백
        }
    };

    const removeStudent = async (studentId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        
        // 낙관적 업데이트 (즉각 화면에서 제거)
        setStudents(prev => prev.filter(s => s.id !== studentId));
        setAttendance(prev => {
            const next = { ...prev };
            delete next[studentId];
            return next;
        });

        try {
            await deleteStudent(dataConnect, { id: studentId });
            fetchData(true); // 조용히 백그라운드 갱신
        } catch (e) {
            console.error(e);
            alert('학생 삭제 실패');
            fetchData(true); // 실패 시 롤백
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
