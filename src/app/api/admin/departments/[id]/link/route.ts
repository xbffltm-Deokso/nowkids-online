import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, departments } from '@/lib/schema';
import { ApiError, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { hashLinkToken, newLinkToken } from '@/lib/department-link';

// POST /api/admin/departments/[id]/link — 부서 출석 링크를 새로 만들거나 교체 (이전 링크는 즉시 무효)
// 링크 원문은 저장하지 않으므로 이 응답에서 한 번만 받을 수 있음
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, '부서를 찾을 수 없습니다.');

    const token = newLinkToken();
    const [dep] = await db
        .update(departments)
        .set({ linkTokenHash: hashLinkToken(token) })
        .where(and(eq(departments.id, id), eq(departments.kind, 'school'), isNull(departments.archivedAt)))
        .returning({ name: departments.name });
    if (!dep) throw new ApiError(404, '출석 링크를 만들 수 있는 부서가 아닙니다.');

    await db.insert(adminLogs).values({
        action: 'link',
        summary: `${dep.name} 출석 링크 발급(이전 링크 무효)`,
        count: 1,
        ip: clientIp(req),
    });

    return NextResponse.json({ department: dep.name, path: `/t/${token}` });
});
