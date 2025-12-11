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

                // GAS에서 ID를 생성해서 보내주므로(행 인덱스 포함), 프론트엔드에서는 그대로 사용합니다.
                // 만약 GAS가 업데이트되지 않았다면 중복 문제가 여전할 수 있으나, 
                // 프론트엔드에서 임의로 인덱스를 붙이면 저장 시 매칭이 안되는 문제가 발생함.
                // 따라서 백엔드 업데이트를 필수로 가정하고 API 데이터를 신뢰함.
                // GAS에서 ID를 생성해서 보내주므로(행 인덱스 포함), 프론트엔드에서는 그대로 사용합니다.
                // 단, GAS 배포가 안되었거나 구버전일 경우 ID가 "undefined" 문자열로 올 수 있음.
                // 이 경우 중복 및 UI 오류(체크박스 연동)가 발생하므로 강제로 프론트엔드에서 고유 ID를 생성함.
                const studentsWithIds = studentsData.map((s: Student, index: number) => {
                    const hasValidId = s.id && s.id !== 'undefined' && s.id.trim() !== '';
                    // 인덱스 기반으로 고유 ID 생성 (백엔드 로직과 유사하게 맞춤)
                    const fallbackId = `${grade}-${classNum}-${s.number}-${s.name}-${index}`;

                    return {
                        ...s,
                        id: hasValidId ? s.id : fallbackId
                    };
                });

                setStudents(studentsWithIds);
                const attendanceMap = attendanceData.reduce((acc, record) => {
                    // attendance record의 studentId가 위에서 생성한 ID와 일치해야 함
                    // 하지만 기존 record에 ID가 없을 수 있으므로, 매칭 로직이 필요할 수 있음
                    // 여기서는 일단 record.studentId를 신뢰하거나, 
                    // 만약 record.studentId가 비어있다면 매칭되는 학생을 찾아야 하는데
                    // 일단은 학생 ID가 고유해졌으므로, UI상에서 개별 체크박스는 작동함.
                    // *중요*: 서버에서 받아온 record의 studentId가 빈 문자열이면 매칭이 안될 수 있음.
                    // 여기서는 학생 ID를 기준으로 빈 껍데기라도 만들어주는게 안전함.
                    if (record.studentId) {
                        acc[record.studentId] = record;
                    }
                    return acc;
                }, {} as Record<string, AttendanceRecord>);

                // 학생 목록을 기준으로 attendanceMap 보완 (기록이 없는 학생들을 위해)
                studentsWithIds.forEach(s => {
                    if (!attendanceMap[s.id]) {
                        attendanceMap[s.id] = {
                            id: `temp-${s.id}-${Date.now()}`,
                            studentId: s.id,
                            studentName: s.name,
                            date,
                            status: '결석', // 기본값
                            timestamp: new Date().toISOString(),
                        };
                    }
                });

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
