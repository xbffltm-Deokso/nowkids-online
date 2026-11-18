import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, departments } from '@/lib/schema';
import { ApiError, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { hashLinkToken, newLinkToken } from '@/lib/department-link';

// GET  /api/admin/departments/[id]/link — 지금 쓰는 출석 링크 다시 받기 (복사용)
// POST /api/admin/departments/[id]/link — 출석 링크를 새로 만들거나 교체 (이전 링크는 즉시 무효)
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, '부서를 찾을 수 없습니다.');
    const [dep] = await db
        .select({ name: departments.name, token: departments.linkToken, hash: departments.linkTokenHash })
        .from(departments)
        .where(and(eq(departments.id, id), isNull(departments.archivedAt)));
    if (!dep) throw new ApiError(404, '부서를 찾을 수 없습니다.');
    if (!dep.hash) throw new ApiError(404, '아직 출석 링크가 없습니다. 링크 만들기를 눌러 주세요.');
    if (!dep.token) {
        throw new ApiError(409, '예전 방식으로 만든 링크라 다시 꺼낼 수 없습니다. 새 링크로 교체해 주세요.');
    }
    return NextResponse.json({ department: dep.name, path: `/t/${dep.token}` });
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, '부서를 찾을 수 없습니다.');

    const token = newLinkToken();
    const [dep] = await db
        .update(departments)
        .set({ linkTokenHash: hashLinkToken(token), linkToken: token })
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
