import { and, eq, isNull, SQL } from 'drizzle-orm';
import { classes, grades, students } from '@/lib/schema';
import { badRequest, requireInt } from '@/lib/api-utils';
import { UUID_RE } from '@/lib/department-admin';

// 학생 조회 범위 — 부서(필수)·학년·반(선택) 또는 예전 소년부 학년 문자열·반 번호
// ?departmentId=…&gradeId=…&classId=…|none   (classId=none → 반 미배정)
// ?grade=4.믿음|all&classNum=0                (예전 교사 화면 호환)
export function studentScope(params: URLSearchParams): SQL | undefined {
    const departmentId = params.get('departmentId');
    if (departmentId) {
        if (!UUID_RE.test(departmentId)) badRequest('부서가 올바르지 않습니다.');
        const conditions: SQL[] = [eq(students.departmentId, departmentId)];
        const gradeId = params.get('gradeId');
        if (gradeId) {
            if (!UUID_RE.test(gradeId)) badRequest('학년이 올바르지 않습니다.');
            conditions.push(eq(students.gradeId, gradeId));
        }
        const classId = params.get('classId');
        if (classId === 'none') conditions.push(isNull(students.classId));
        else if (classId) {
            if (!UUID_RE.test(classId)) badRequest('반이 올바르지 않습니다.');
            conditions.push(eq(students.classId, classId));
        }
        return and(...conditions);
    }

    const grade = params.get('grade');
    if (!grade) badRequest('departmentId 또는 grade가 필요합니다.');
    const conditions: SQL[] = [];
    if (grade !== 'all') conditions.push(eq(students.grade, grade));
    const classNum = params.get('classNum');
    if (classNum !== null && classNum !== '0') conditions.push(eq(students.classNum, requireInt(classNum, 'classNum', 1)));
    return conditions.length > 0 ? and(...conditions) : undefined;
}

// 화면 표시용 학년·반 이름 (학년 이름이 반 이름 앞에 붙어 있으면 떼어 "1반"처럼)
export const studentLabelColumns = {
    gradeName: grades.name,
    gradeOrder: grades.sortOrder,
    className: classes.name,
    classOrder: classes.sortOrder,
};

export function toLabels(row: {
    gradeName: string | null;
    gradeOrder: number | null;
    className: string | null;
    classOrder: number | null;
}) {
    const gradeLabel = row.gradeName ?? '';
    let classLabel = row.className ?? '미배정';
    if (gradeLabel && classLabel.startsWith(`${gradeLabel} `)) classLabel = classLabel.slice(gradeLabel.length + 1);
    return {
        gradeLabel,
        classLabel,
        order: (row.gradeOrder ?? 0) * 1000 + (row.classOrder ?? 999),
    };
}
