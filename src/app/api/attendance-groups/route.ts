import { NextRequest, NextResponse } from 'next/server';
import { computeAttendanceSummaries } from '@/lib/attendance-groups';
import { withErrorHandling } from '@/lib/api-utils';

// GET /api/attendance-groups — 학생별 최근 52주 출석률·출석 그룹(A~E)·연속 결석 주 수
export const GET = withErrorHandling(async (_req: NextRequest) => {
    return NextResponse.json(await computeAttendanceSummaries());
});
