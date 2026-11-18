import { NextRequest, NextResponse } from 'next/server';
import { asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classes, departments, divisions, grades, students } from '@/lib/schema';
import { withErrorHandling } from '@/lib/api-utils';
import { ACTIVE_STATUSES } from '@/utils/studentStatus';

// GET /api/departments — 부서 목록 (이름·종류·예배 시간·대상 나이, 출석 링크가 있는지만. 링크 원문은 저장하지 않으므로 없음)
// ?detail=1 — 부서 관리 화면용: 폐지한 부서·교육부·다음 부서·반·재적 인원까지 (개인정보 없음)
export const GET = withErrorHandling(async (req: NextRequest) => {
    const detail = req.nextUrl.searchParams.get('detail') === '1';

    const rows = await db
        .select({
            id: departments.id,
            name: departments.name,
            kind: departments.kind,
            serviceTime: departments.serviceTime,
            ageMin: departments.ageMin,
            ageMax: departments.ageMax,
            hasLink: departments.linkTokenHash,
            division: divisions.name,
            divisionId: departments.divisionId,
            sortOrder: departments.sortOrder,
            nextDepartmentId: departments.nextDepartmentId,
            ch2chOrgName: departments.ch2chOrgName,
            archivedAt: departments.archivedAt,
        })
        .from(departments)
        .innerJoin(divisions, eq(divisions.id, departments.divisionId))
        .where(detail ? undefined : isNull(departments.archivedAt))
        .orderBy(asc(divisions.sortOrder), asc(departments.sortOrder), asc(departments.name));

    if (!detail) {
        return NextResponse.json(
            rows.map((r) => ({
                id: r.id,
                name: r.name,
                kind: r.kind,
                serviceTime: r.serviceTime,
                ageMin: r.ageMin,
                ageMax: r.ageMax,
                hasLink: r.hasLink !== null,
                division: r.division,
            }))
        );
    }

    const [divisionRows, classRows, countRows, gradeRows] = await Promise.all([
        db.select({ id: divisions.id, name: divisions.name }).from(divisions).orderBy(asc(divisions.sortOrder)),
        db
            .select({ id: classes.id, departmentId: classes.departmentId, name: classes.name })
            .from(classes)
            .where(isNull(classes.archivedAt))
            .orderBy(asc(classes.sortOrder), asc(classes.name)),
        db
            .select({ departmentId: students.departmentId, n: count() })
            .from(students)
            .where(inArray(students.status, ACTIVE_STATUSES))
            .groupBy(students.departmentId),
        db
            .select({ id: grades.id, departmentId: grades.departmentId, name: grades.name })
            .from(grades)
            .where(isNull(grades.archivedAt))
            .orderBy(asc(grades.sortOrder)),
    ]);
    const counts = new Map(countRows.map((c) => [c.departmentId, c.n]));

    return NextResponse.json({
        divisions: divisionRows,
        departments: rows.map((r) => ({
            ...r,
            hasLink: r.hasLink !== null,
            archived: r.archivedAt !== null,
            archivedAt: undefined,
            activeStudents: counts.get(r.id) ?? 0,
            classes: classRows.filter((c) => c.departmentId === r.id).map(({ id, name }) => ({ id, name })),
            grades: gradeRows.filter((g) => g.departmentId === r.id).map(({ id, name }) => ({ id, name })),
        })),
    });
});
