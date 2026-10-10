export type Gender = 'M' | 'F';
export type StudentStatus = '재학' | '휴학' | '전학';

export interface Student {
    id: string;
    grade: string;
    classNum: number;
    number: number;
    name: string;
    gender: Gender;
    status: StudentStatus;
}

export type AttendanceStatus = boolean; // TRUE = 출석, FALSE = 결석

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName?: string;
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
    reason?: string;
    timestamp: string; // ISO String
}
