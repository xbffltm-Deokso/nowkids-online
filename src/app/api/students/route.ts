import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { students } from '@/lib/schema';
import {
    asObject,
    badRequest,
    readJson,
    requireInt,
    requireOneOf,
    requireString,
    withErrorHandling,
} from '@/lib/api-utils';

const GENDERS = ['M', 'F'] as const;
const STATUSES = ['재학', '휴학', '전학'] as const;

export const GET = withErrorHandling(async (req: NextRequest) => {
    const grade = req.nextUrl.searchParams.get('grade');
    const classNum = req.nextUrl.searchParams.get('classNum');

    if (!grade) {
        badRequest('grade는 필수입니다.');
    }

    // grade=all 이면 전 학년, classNum=0 이면 전체 반
    const conditions = [];
    if (grade !== 'all') {
        conditions.push(eq(students.grade, grade));
    }
    if (classNum !== null && classNum !== '0') {
        conditions.push(eq(students.classNum, requireInt(classNum, 'classNum', 1)));
    }

    const rows = await db
        .select()
        .from(students)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(students.grade), asc(students.classNum), asc(students.number));

    return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
    const body = asObject(await readJson(req));

    const values = {
        id: requireString(body.id, 'id'),
        grade: requireString(body.grade, 'grade'),
        classNum: requireInt(body.classNum, 'classNum', 1),
        number: requireInt(body.number ?? 0, 'number'),
        name: requireString(body.name, 'name').trim(),
        gender: requireOneOf(body.gender ?? 'M', 'gender', GENDERS),
        status: requireOneOf(body.status ?? '재학', 'status', STATUSES),
    };

    const [row] = await db
        .insert(students)
        .values(values)
        .onConflictDoUpdate({ target: students.id, set: values })
        .returning();

    return NextResponse.json(row);
});
