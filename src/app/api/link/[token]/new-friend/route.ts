import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attendanceChanges, attendanceRecords, classes, students, studentPrivate } from '@/lib/schema';
import {
    ApiError,
    asObject,
    readJson,
    requireDate,
    requireOneOf,
    requireString,
    withErrorHandling,
} from '@/lib/api-utils';
import { departmentFromToken } from '@/lib/department-link';

// POST /api/link/[token]/new-friend { name, birthDate, gender, classId?, date, force? }
// 새 친구를 "새친구" 상태 학생으로 바로 만들고 그날 출석으로 기록. 교역자가 확인하면 "재학"으로 바꿈
// 생년월일은 개인정보 테이블에 쓰기만 하고, 링크로는 다시 볼 수 없음
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const dep = await departmentFromToken(token);
    const body = asObject(await readJson(req));

    const name = requireString(body.name, 'name').trim().slice(0, 30);
    const birthDate = requireDate(body.birthDate, 'birthDate');
    const gender = requireOneOf(body.gender, 'gender', ['M', 'F'] as const);
    const date = requireDate(body.date, 'date');
    const classId = typeof body.classId === 'string' && body.classId ? body.classId : null;

    if (classId) {
        const [cls] = await db
            .select({ id: classes.id })
            .from(classes)
            .where(and(eq(classes.id, classId), eq(classes.departmentId, dep.id)));
        if (!cls) throw new ApiError(400, '이 부서의 반이 아닙니다.');
    }

    // 같은 부서에 같은 이름이 있으면 한 번 확인 (force로 그래도 등록 가능)
    if (body.force !== true) {
        const same = await db
            .select({ id: students.id })
            .from(students)
            .where(and(eq(students.departmentId, dep.id), eq(students.name, name), inArray(students.status, ['재학', '휴학', '새친구'])));
        if (same.length > 0) {
            throw new ApiError(409, `이 부서에 이미 "${name}" 학생이 있습니다. 같은 친구라면 목록에서 출석을 체크해 주세요.`);
        }
    }

    const id = randomUUID();
    await db.batch([
        db.insert(students).values({
            id,
            // 이전 화면과의 호환용 (부서 구조로 옮긴 뒤 제거 예정)
            grade: dep.name,
            classNum: 0,
            number: 0,
            name,
            gender,
            status: '새친구',
            departmentId: dep.id,
            classId,
            source: 'link',
        }),
        db.insert(studentPrivate).values({ studentId: id, birthDate }),
        db.insert(attendanceRecords).values({ id: `${id}_${date}`, studentId: id, date, status: true, updatedVia: 'link' }),
        db.insert(attendanceChanges).values({
            studentId: id,
            date,
            oldStatus: null,
            newStatus: true,
            via: 'link',
            departmentId: dep.id,
        }),
    ]);

    return NextResponse.json({ id, name, classId, status: '새친구' });
});
