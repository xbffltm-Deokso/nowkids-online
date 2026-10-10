// 엑셀·외부 명단의 이름을 NowKids 학생과 연결 (ch2ch 북마클릿과 같은 규칙)
// 1) 이름이 같으면 연결 2) 없으면 끝의 동명이인 구분 영문 대문자(강세원B 등)를 떼고 비교
// 후보가 여럿이면 학년 숫자가 같은 학생으로 좁히고, 그래도 여럿이면 연결하지 않음

export interface MatchableStudent {
    id: string;
    name: string;
    grade: string; // 예: "4.믿음"
}

export type MatchResult<T extends MatchableStudent> =
    | { kind: 'exact'; student: T }
    | { kind: 'loose'; student: T }
    | { kind: 'ambiguous' }
    | { kind: 'none' };

function baseName(name: string): string {
    return name.trim().replace(/\s*[A-Z]+$/, '');
}

function narrowByGrade<T extends MatchableStudent>(candidates: T[], gradeDigit?: string): T[] {
    if (!gradeDigit || candidates.length <= 1) return candidates;
    const sameGrade = candidates.filter((s) => s.grade.startsWith(`${gradeDigit}.`));
    return sameGrade.length > 0 ? sameGrade : candidates;
}

export function matchStudent<T extends MatchableStudent>(
    students: T[],
    name: string,
    gradeDigit?: string
): MatchResult<T> {
    const trimmed = name.trim();
    const exact = narrowByGrade(students.filter((s) => s.name === trimmed), gradeDigit);
    if (exact.length === 1) return { kind: 'exact', student: exact[0] };
    if (exact.length > 1) return { kind: 'ambiguous' };

    const base = baseName(trimmed);
    const loose = narrowByGrade(students.filter((s) => baseName(s.name) === base), gradeDigit);
    if (loose.length === 1) return { kind: 'loose', student: loose[0] };
    return { kind: loose.length > 1 ? 'ambiguous' : 'none' };
}
