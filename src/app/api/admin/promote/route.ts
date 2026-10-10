import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, students } from '@/lib/schema';
import { ApiError, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { GRADES } from '@/utils/grades';

// POST /api/admin/promote — 학년 진급 처리 (한 해에 한 번만)
// 마지막 학년(6.사랑) 재적 학생은 상태를 '진급'(중등부)으로, 나머지는 한 학년씩 올림
// 반 번호는 그대로 두므로 새 반 편성은 학생 관리에서 따로 함. 출석 기록은 그대로 보존
const ACTIVE = ['재학', '휴학'];

function koreaYear(): number {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
}

export const POST = withErrorHandling(async (req: NextRequest) => {
    await requireAdmin(req);

    // 같은 해에 두 번 실행하면 4학년이 6학년까지 올라가므로 막음
    const year = koreaYear();
    const yearStart = new Date(`${year}-01-01T00:00:00+09:00`);
    const [already] = await db
        .select({ id: adminLogs.id })
        .from(adminLogs)
        .where(and(eq(adminLogs.action, 'promote'), gte(adminLogs.createdAt, yearStart)))
        .limit(1);
    if (already) {
        throw new ApiError(409, `${year}년에는 이미 진급 처리를 했습니다. 다시 하려면 개발자에게 문의해 주세요.`);
    }

    const last = GRADES[GRADES.length - 1];
    // 위 학년부터 처리해야 방금 올라간 학생이 다시 올라가지 않음 — batch는 한 트랜잭션으로 실행됨
    const results = await db.batch([
        db
            .update(students)
            .set({ status: '진급' })
            .where(and(eq(students.grade, last), inArray(students.status, ACTIVE)))
            .returning({ id: students.id }),
        ...GRADES.slice(0, -1)
            .map((grade, i) =>
                db
                    .update(students)
                    .set({ grade: GRADES[i + 1] })
                    .where(and(eq(students.grade, grade), inArray(students.status, ACTIVE)))
                    .returning({ id: students.id })
            )
            .reverse(),
    ]);

    const graduated = results[0].length;
    // reverse()로 위 학년부터 넣었으므로 다시 아래 학년 순서로
    const moved = results.slice(1).reverse().map((rows, i) => ({
        from: GRADES[i],
        to: GRADES[i + 1],
        count: rows.length,
    }));
    const total = graduated + moved.reduce((sum, m) => sum + m.count, 0);

    await db.insert(adminLogs).values({
        action: 'promote',
        summary: `${year}년 진급 처리: ${last} ${graduated}명 중등부 진급, ` +
            moved.map((m) => `${m.from}→${m.to} ${m.count}명`).join(', '),
        count: total,
        ip: clientIp(req),
    });

    return NextResponse.json({ year, graduated, moved });
});
