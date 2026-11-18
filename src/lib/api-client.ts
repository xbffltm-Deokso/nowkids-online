import { Student, AttendanceRecord, AttendanceSummaryResult, PrivateImportResult, AdminLog, PromoteResult, StudentScope } from '@/types';

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

function scopeParams(scope: StudentScope): URLSearchParams {
    const params = new URLSearchParams({ departmentId: scope.departmentId });
    if (scope.gradeId) params.set('gradeId', scope.gradeId);
    if (scope.classId) params.set('classId', scope.classId);
    return params;
}

// 부서(학년·반) 기준 학생 목록 — 학년·반 이름(gradeLabel·classLabel) 포함
export function fetchStudentsIn(scope: StudentScope): Promise<Student[]> {
    return request(`/api/students?${scopeParams(scope)}`);
}

export function fetchAttendanceIn(
    scope: StudentScope,
    options: { date?: string; from?: string } = {}
): Promise<AttendanceRecord[]> {
    const params = scopeParams(scope);
    if (options.date) params.set('date', options.date);
    if (options.from) params.set('from', options.from);
    return request(`/api/attendance?${params}`);
}

// 학생 추가·수정 — 부서 기준이면 departmentId·gradeId·classId, 예전 화면은 grade·classNum
export function saveStudentApi(
    student: Partial<Student> & Pick<Student, 'id' | 'name'>
): Promise<Student> {
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

// 출석 기록 삭제는 관리자 비밀번호 필요 (middleware에서 확인)
export function deleteAttendanceApi(
    targets: Array<Pick<AttendanceRecord, 'studentId' | 'date'>>,
    adminPassword: string
): Promise<AttendanceRecord[]> {
    return request('/api/attendance', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': encodeURIComponent(adminPassword),
        },
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

// 학생별 최근 52주 출석률·출석 그룹·연속 결석
export function fetchAttendanceGroups(departmentId?: string): Promise<AttendanceSummaryResult> {
    return request(`/api/attendance-groups${departmentId ? `?departmentId=${departmentId}` : ''}`);
}

// 관리자 비밀번호 헤더 (헤더에는 ASCII만 들어가므로 인코딩)
function adminHeaders(adminPassword: string): Record<string, string> {
    return { 'X-Admin-Password': encodeURIComponent(adminPassword) };
}

// 교적 엑셀의 개인정보 가져오기
export function importPrivateData(file: File, adminPassword: string): Promise<PrivateImportResult> {
    const form = new FormData();
    form.append('file', file);
    return request('/api/admin/private-import', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body: form,
    });
}

export function fetchAdminLogs(): Promise<AdminLog[]> {
    return request('/api/admin-logs');
}

// 진급자 DB 엑셀 내려받기 — 파일을 받아 브라우저 다운로드로 저장
// target: { departmentId, gradeId? } (부서·학년) 또는 { grade } (예전 학년 문자열)
export async function downloadPromotionDb(
    target: { departmentId: string; gradeId?: string } | { grade: string },
    adminPassword: string
): Promise<void> {
    const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(adminPassword) },
        body: JSON.stringify(target),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `요청 실패 (${res.status})`);
    }
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const fileName = decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1] ?? '진급자DB.xlsx');
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

// 학년 진급 처리 (한 해에 한 번)
export function promoteStudents(adminPassword: string): Promise<PromoteResult> {
    return request('/api/admin/promote', { method: 'POST', headers: adminHeaders(adminPassword) });
}

// 바꾼 학생만 저장 (+ 기록 없던 학생은 결석으로 채움, 이미 있으면 그대로)
export function saveAttendanceChangesApi(
    date: string,
    changes: { studentId: string; status: boolean; reason: string | null }[],
    fillAbsent: string[]
): Promise<{ saved: number; filled: number }> {
    return request('/api/attendance/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, changes, fillAbsent }),
    });
}
