import { Student, AttendanceRecord } from '@/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `요청 실패 (${res.status})`);
    }
    return res.json();
}

// classNum=0 이면 해당 학년 전체 반
export function fetchStudents(grade: string, classNum: number): Promise<Student[]> {
    return request(`/api/students?grade=${encodeURIComponent(grade)}&classNum=${classNum}`);
}

export function saveStudentApi(student: Student): Promise<Student> {
    return request('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
    });
}

export function deleteStudentApi(id: string): Promise<Student> {
    return request(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// date를 생략하면 전체 이력
export function fetchAttendance(
    grade: string,
    classNum: number,
    date?: string
): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams({ grade, classNum: String(classNum) });
    if (date) params.set('date', date);
    return request(`/api/attendance?${params}`);
}

export function saveAttendanceApi(
    records: Array<Pick<AttendanceRecord, 'id' | 'studentId' | 'date' | 'status' | 'reason'>>
): Promise<AttendanceRecord[]> {
    return request('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
    });
}
