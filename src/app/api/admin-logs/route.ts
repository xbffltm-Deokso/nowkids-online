import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs } from '@/lib/schema';
import { withErrorHandling } from '@/lib/api-utils';

// GET /api/admin-logs — 최근 관리자 작업 기록 (개인정보·IP 없이 시각·종류·요약만)
export const GET = withErrorHandling(async (_req: NextRequest) => {
    const rows = await db
        .select({
            id: adminLogs.id,
            action: adminLogs.action,
            summary: adminLogs.summary,
            count: adminLogs.count,
            createdAt: adminLogs.createdAt,
        })
        .from(adminLogs)
        .orderBy(desc(adminLogs.createdAt))
        .limit(30);
    return NextResponse.json(rows);
});
