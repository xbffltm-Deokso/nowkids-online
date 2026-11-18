import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, divisions } from '@/lib/schema';
import { withErrorHandling } from '@/lib/api-utils';

// GET /api/departments — 부서 목록 (이름·종류·예배 시간, 출석 링크가 있는지만. 링크 원문은 저장하지 않으므로 없음)
export const GET = withErrorHandling(async (_req: NextRequest) => {
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
        })
        .from(departments)
        .innerJoin(divisions, eq(divisions.id, departments.divisionId))
        .where(isNull(departments.archivedAt))
        .orderBy(asc(divisions.sortOrder), asc(departments.sortOrder));

    return NextResponse.json(rows.map((r) => ({ ...r, hasLink: r.hasLink !== null })));
});
