import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminLogs, departments } from '@/lib/schema';
import { asObject, badRequest, readJson, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { parseDepartmentInput, validateDepartment } from '@/lib/department-admin';

// POST /api/admin/departments — 새 부서 만들기 (개편으로 부서가 생길 때)
export const POST = withErrorHandling(async (req: NextRequest) => {
    await requireAdmin(req);
    const input = parseDepartmentInput(asObject(await readJson(req)));
    if (!input.name) badRequest('부서 이름은 필수입니다.');
    if (!input.divisionId) badRequest('교육부를 선택해 주세요.');

    const merged = {
        name: input.name,
        divisionId: input.divisionId,
        ageMin: input.ageMin ?? null,
        ageMax: input.ageMax ?? null,
        nextDepartmentId: input.nextDepartmentId ?? null,
        ch2chOrgName: input.ch2chOrgName ?? null,
    };
    await validateDepartment(null, merged);

    const [created] = await db
        .insert(departments)
        .values({
            ...merged,
            kind: input.kind ?? 'school',
            serviceTime: input.serviceTime ?? null,
            sortOrder: input.sortOrder ?? 100,
        })
        .returning({ id: departments.id, name: departments.name });

    await db.insert(adminLogs).values({
        action: 'department',
        summary: `부서 추가: ${created.name}`,
        count: 1,
        ip: clientIp(req),
    });
    return NextResponse.json(created, { status: 201 });
});
