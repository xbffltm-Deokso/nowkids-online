import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, departments, students } from '@/lib/schema';
import { ApiError, asObject, readJson, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { findDepartment, parseDepartmentInput, validateDepartment } from '@/lib/department-admin';
import { ACTIVE_STATUSES } from '@/utils/studentStatus';

// PATCH /api/admin/departments/[id] — 부서 이름·예배 시간·대상 나이·다음 부서·ch2ch 기관명·폐지 여부 고치기
// 폐지는 지우지 않고 숨김(출석 기록·지난 보고서 보존). 재적 학생이 남아 있으면 먼저 옮겨야 함
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    const dep = await findDepartment(id);
    const input = parseDepartmentInput(asObject(await readJson(req)));

    const merged = {
        name: input.name ?? dep.name,
        divisionId: input.divisionId ?? dep.divisionId,
        ageMin: 'ageMin' in input ? input.ageMin ?? null : dep.ageMin,
        ageMax: 'ageMax' in input ? input.ageMax ?? null : dep.ageMax,
        nextDepartmentId: 'nextDepartmentId' in input ? input.nextDepartmentId ?? null : dep.nextDepartmentId,
        ch2chOrgName: 'ch2chOrgName' in input ? input.ch2chOrgName ?? null : dep.ch2chOrgName,
    };
    await validateDepartment(id, merged);

    const archiving = input.archived === true && dep.archivedAt === null;
    if (archiving) {
        const [{ n }] = await db
            .select({ n: count() })
            .from(students)
            .where(and(eq(students.departmentId, id), inArray(students.status, ACTIVE_STATUSES)));
        if (n > 0) {
            throw new ApiError(409, `${dep.name}에 재적 학생이 ${n}명 있습니다. 학생을 다른 부서로 옮긴 뒤 폐지해 주세요.`);
        }
    }

    const [updated] = await db
        .update(departments)
        .set({
            ...merged,
            ...(input.kind ? { kind: input.kind } : {}),
            ...('serviceTime' in input ? { serviceTime: input.serviceTime ?? null } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
            ...(input.archived === undefined
                ? {}
                : input.archived
                  ? { archivedAt: dep.archivedAt ?? new Date(), linkTokenHash: null, linkToken: null } // 폐지하면 출석 링크도 막음
                  : { archivedAt: null }),
        })
        .where(eq(departments.id, id))
        .returning({ id: departments.id, name: departments.name });

    // 폐지한 부서를 다음 부서로 가리키던 부서는 연결을 끊음 (진급 대상이 사라지지 않게 화면에서 다시 지정)
    if (archiving) {
        await db.update(departments).set({ nextDepartmentId: null }).where(eq(departments.nextDepartmentId, id));
    }

    const what = archiving ? '폐지' : input.archived === false && dep.archivedAt ? '다시 사용' : '수정';
    await db.insert(adminLogs).values({
        action: 'department',
        summary: `부서 ${what}: ${dep.name}${updated.name !== dep.name ? ` → ${updated.name}` : ''}`,
        count: 1,
        ip: clientIp(req),
    });
    return NextResponse.json(updated);
});
