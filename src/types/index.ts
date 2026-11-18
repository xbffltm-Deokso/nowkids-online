export type Gender = 'M' | 'F';
export type StudentStatus = '재학' | '휴학' | '전학' | '진급' | '새친구'; // 진급: 중등부로 올라감, 새친구: 교사 링크로 등록돼 확인 전

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

// 최근 52주 출석 그룹 — A 80% 이상, B 60%, C 40%, D 20% 이상, E 20% 미만
export type AttendanceGroup = 'A' | 'B' | 'C' | 'D' | 'E';

export interface AttendanceSummary {
    studentId: string;
    present: number;
    weeks: number; // 분모: 출석부를 쓴 주 중 이 학생의 첫 기록 이후 주
    rate: number | null; // 0~100, 소수 첫째 자리
    group: AttendanceGroup | null;
    absentStreak: number; // 최근 주부터 연속으로 출석하지 않은 주 수
}

export interface AttendanceSummaryResult {
    from: string;
    to: string;
    countedWeeks: number;
    summaries: AttendanceSummary[];
}

// 교적 엑셀 가져오기 결과 (개인정보 값 없이 이름·인원만)
export interface PrivateImportResult {
    totalRows: number;
    updated: number;
    looseMatches: string[];
    unmatched: string[];
    ambiguous: string[];
    duplicates: string[];
    studentsWithoutData: string[];
}

export interface AdminLog {
    id: number;
    action: 'import' | 'export' | 'promote' | 'link';
    summary: string;
    count: number;
    createdAt: string;
}

export interface PromoteResult {
    year: number;
    graduated: number; // 마지막 학년 → 중등부 진급
    moved: { from: string; to: string; count: number }[];
}

// 부서 (출석 링크는 있는지 여부만)
export interface DepartmentSummary {
    id: string;
    name: string;
    kind: 'school' | 'report_only';
    serviceTime: string | null;
    ageMin: number | null;
    ageMax: number | null;
    hasLink: boolean;
    division: string;
}

// 교사 출석 링크 화면 데이터
export interface LinkRoster {
    department: { name: string };
    date: string;
    defaultDate: string;
    classes: { id: string; name: string }[];
    students: { id: string; name: string; classId: string | null; status: string }[];
    attendance: Record<string, { status: boolean; reason: string | null }>;
}
