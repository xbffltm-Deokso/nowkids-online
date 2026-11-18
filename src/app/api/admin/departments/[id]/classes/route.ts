import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, classes, students } from '@/lib/schema';
import { asList, asObject, badRequest, readJson, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { findDepartment, UUID_RE } from '@/lib/department-admin';

// PUT /api/admin/departments/[id]/classes — 부서의 반 목록을 통째로 맞춤 (보낸 순서가 화면 순서)
// [{ id?, name }] — id 있는 반은 이름·순서만 바꾸고, id 없는 반은 새로 만들고, 빠진 반은 숨김
// 숨긴 반의 학생은 "반 미배정"이 됨 (반은 출석 화면 묶음일 뿐이라 기록에는 영향 없음)
export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    const dep = await findDepartment(id);

    const list = asList(await readJson(req)).map((raw) => {
        const item = asObject(raw);
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        if (!name || name.length > 30) badRequest('반 이름은 1~30자로 입력해 주세요.');
        if (item.id !== undefined && (typeof item.id !== 'string' || !UUID_RE.test(item.id))) {
            badRequest('반 정보가 올바르지 않습니다.');
        }
        return { id: item.id as string | undefined, name };
    });
    if (list.length > 50) badRequest('반은 50개까지 만들 수 있습니다.');
    if (new Set(list.map((c) => c.name)).size !== list.length) badRequest('같은 이름의 반이 있습니다.');

    const current = await db
        .select({ id: classes.id })
        .from(classes)
        .where(and(eq(classes.departmentId, id), isNull(classes.archivedAt)));
    const currentIds = new Set(current.map((c) => c.id));
    for (const c of list) {
        if (c.id && !currentIds.has(c.id)) badRequest('이 부서의 반이 아닙니다. 화면을 새로고침해 주세요.');
    }
    const keep = new Set(list.filter((c) => c.id).map((c) => c.id));
    const removed = [...currentIds].filter((cid) => !keep.has(cid));

    const queries = [];
    list.forEach((c, i) => {
        queries.push(
            c.id
                ? db.update(classes).set({ name: c.name, sortOrder: i + 1 }).where(eq(classes.id, c.id))
                : db.insert(classes).values({ departmentId: id, name: c.name, sortOrder: i + 1 })
        );
    });
    if (removed.length > 0) {
        queries.push(db.update(students).set({ classId: null }).where(inArray(students.classId, removed)));
        queries.push(db.update(classes).set({ archivedAt: new Date() }).where(inArray(classes.id, removed)));
    }
    queries.push(
        db.insert(adminLogs).values({
            action: 'department',
            summary: `${dep.name} 반 구성 변경 (${list.length}개 반${removed.length ? `, ${removed.length}개 숨김` : ''})`,
            count: list.length,
            ip: clientIp(req),
        })
    );
    await db.batch(queries as [(typeof queries)[number], ...typeof queries]);

    return NextResponse.json({ classes: list.length, removed: removed.length });
});
