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

export type AttendanceStatus = '출석' | '지각' | '결석' | '조퇴' | '기타';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName?: string;
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
    timestamp: string; // ISO String
}

export interface AttendanceSummary {
    present: number;
    late: number;
    absent: number;
    earlyLeave: number;
    etc: number;
    total: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface GradeClassOption {
    grade: string;
    classNum: number;
}
