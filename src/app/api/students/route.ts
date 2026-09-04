import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { students } from '@/lib/schema';

export async function GET(req: NextRequest) {
    const grade = req.nextUrl.searchParams.get('grade');
    const classNum = req.nextUrl.searchParams.get('classNum');

    if (!grade) {
        return NextResponse.json({ error: 'grade는 필수입니다.' }, { status: 400 });
    }

    // grade=all 이면 전 학년, classNum=0 이면 전체 반
    const conditions = [];
    if (grade !== 'all') {
        conditions.push(eq(students.grade, grade));
    }
    if (classNum !== null && classNum !== '0') {
        const parsed = Number(classNum);
        if (Number.isNaN(parsed)) {
            return NextResponse.json({ error: 'classNum이 올바르지 않습니다.' }, { status: 400 });
        }
        conditions.push(eq(students.classNum, parsed));
    }

    const rows = await db
        .select()
        .from(students)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(students.grade), asc(students.classNum), asc(students.number));

    return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { id, grade, classNum, number, name, gender, status } = body ?? {};

    if (!id || !grade || !name) {
        return NextResponse.json({ error: 'id, grade, name은 필수입니다.' }, { status: 400 });
    }

    const values = {
        id: String(id),
        grade: String(grade),
        classNum: Number(classNum),
        number: Number(number),
        name: String(name),
        gender: String(gender ?? 'M'),
        status: String(status ?? '재학'),
    };

    const [row] = await db
        .insert(students)
        .values(values)
        .onConflictDoUpdate({ target: students.id, set: values })
        .returning();

    return NextResponse.json(row);
}
