import { NextRequest, NextResponse } from 'next/server';
import { computeAttendanceSummaries } from '@/lib/attendance-groups';
import { badRequest, withErrorHandling } from '@/lib/api-utils';
import { UUID_RE } from '@/lib/department-admin';

// GET /api/attendance-groups?departmentId= — 학생별 최근 52주 출석률·출석 그룹(A~E)·연속 결석 주 수
// departmentId를 주면 그 부서 학생만, 없으면 전체
export const GET = withErrorHandling(async (req: NextRequest) => {
    const departmentId = req.nextUrl.searchParams.get('departmentId') ?? undefined;
    if (departmentId && !UUID_RE.test(departmentId)) badRequest('부서가 올바르지 않습니다.');
    return NextResponse.json(await computeAttendanceSummaries(undefined, departmentId));
});
