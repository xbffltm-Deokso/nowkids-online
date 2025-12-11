import { Student, AttendanceRecord } from '@/types';

export const MOCK_STUDENTS: Student[] = Array.from({ length: 25 }, (_, i) => ({
    id: `s-${i + 1}`,
    grade: '1',
    classNum: 1,
    number: i + 1,
    name: `학생 ${i + 1}`,
    gender: i % 2 === 0 ? 'M' : 'F',
    status: '재학',
}));

export const MOCK_ATTENDANCE: AttendanceRecord[] = MOCK_STUDENTS.map((student) => ({
    id: `a-${student.id}`,
    studentId: student.id,
    date: new Date().toISOString().split('T')[0],
    status: false, // 기본값: FALSE (결석)
    timestamp: new Date().toISOString(),
}));

// Mock API 지연 시뮬레이션
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
