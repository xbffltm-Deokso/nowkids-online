// 엑셀·외부 명단의 이름을 앱 학생과 연결 (ch2ch 북마클릿과 같은 규칙)
// 1) 이름이 같으면 연결
// 2) 없으면 끝의 동명이인 구분 영문 대문자(강세원B 등)를 떼고 비교 — 단, 알파벳이 한쪽에만 있을 때만
//    (김하준A ↔ 김하준B 는 서로 다른 사람이라 절대 연결하지 않음)
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

export function baseName(name: string): string {
    return name.trim().replace(/\s*[A-Z]+$/, '');
}

export function suffixOf(name: string): string {
    return /[A-Z]+$/.exec(name.trim())?.[0] ?? '';
}

// 같은 사람일 수 있는 이름인지: 알파벳을 뗀 이름이 같고, 알파벳이 한쪽에만 있거나 둘 다 없음
export function couldBeSame(a: string, b: string): boolean {
    if (baseName(a) !== baseName(b)) return false;
    const sa = suffixOf(a);
    const sb = suffixOf(b);
    return !sa || !sb || sa === sb;
}

function narrowByGrade<T extends MatchableStudent>(candidates: T[], gradeDigit?: string): T[] {
    if (!gradeDigit || candidates.length <= 1) return candidates;
    const sameGrade = candidates.filter((s) => s.grade.startsWith(`${gradeDigit}.`));
    return sameGrade.length > 0 ? sameGrade : candidates;
}

// allowLoose=false: 표기가 다른 이름은 연결하지 않음 (같은 명단에 알파벳만 다른 이름이 여럿일 때 등)
export function matchStudent<T extends MatchableStudent>(
    students: T[],
    name: string,
    gradeDigit?: string,
    allowLoose = true
): MatchResult<T> {
    const trimmed = name.trim();
    const exact = narrowByGrade(students.filter((s) => s.name === trimmed), gradeDigit);
    if (exact.length === 1) return { kind: 'exact', student: exact[0] };
    if (exact.length > 1) return { kind: 'ambiguous' };

    const loose = narrowByGrade(students.filter((s) => s.name.trim() !== trimmed && couldBeSame(s.name, trimmed)), gradeDigit);
    if (loose.length === 0) return { kind: 'none' };
    if (!allowLoose || loose.length > 1) return { kind: 'ambiguous' };
    return { kind: 'loose', student: loose[0] };
}
