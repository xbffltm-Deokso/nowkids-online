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

// date: 특정 날짜만, from: 해당 날짜 이후만, 둘 다 생략하면 전체 이력
export function fetchAttendance(
    grade: string,
    classNum: number,
    options: { date?: string; from?: string } = {}
): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams({ grade, classNum: String(classNum) });
    if (options.date) params.set('date', options.date);
    if (options.from) params.set('from', options.from);
    return request(`/api/attendance?${params}`);
}

export function deleteAttendanceApi(
    targets: Array<Pick<AttendanceRecord, 'studentId' | 'date'>>
): Promise<AttendanceRecord[]> {
    return request('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targets),
    });
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
