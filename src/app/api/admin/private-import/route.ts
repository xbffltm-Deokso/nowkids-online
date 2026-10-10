import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, students, studentPrivate } from '@/lib/schema';
import { badRequest, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { readPrivateRows } from '@/lib/private-excel';
import { matchStudent } from '@/lib/student-matching';
import { isActiveStatus } from '@/utils/studentStatus';

// POST /api/admin/private-import — 교적 엑셀(multipart 'file')의 개인정보를 이름으로 학생과 맞춰 저장
// 응답에는 개인정보 값 없이 연결 결과(이름 목록·인원)만 담음
export const POST = withErrorHandling(async (req: NextRequest) => {
    await requireAdmin(req);

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
        badRequest('엑셀 파일을 선택해 주세요.');
    }

    const rows = await readPrivateRows(await file.arrayBuffer());
    const activeStudents = (await db.select().from(students)).filter((s) => isActiveStatus(s.status));

    const values: (typeof studentPrivate.$inferInsert)[] = [];
    const matchedIds = new Set<string>();
    const looseMatches: string[] = [];
    const unmatched: string[] = [];
    const ambiguous: string[] = [];
    const duplicates: string[] = [];

    for (const row of rows) {
        const result = matchStudent(activeStudents, row.name, row.gradeDigit);
        if (result.kind === 'none') {
            unmatched.push(row.name);
            continue;
        }
        if (result.kind === 'ambiguous') {
            ambiguous.push(row.name);
            continue;
        }
        const { student } = result;
        if (matchedIds.has(student.id)) {
            duplicates.push(row.name);
            continue;
        }
        matchedIds.add(student.id);
        if (result.kind === 'loose') looseMatches.push(`${row.name} → ${student.name}`);
        values.push({
            studentId: student.id,
            teacher: row.teacher,
            birthDate: row.birthDate,
            phone: row.phone,
            motherName: row.motherName,
            motherPhone: row.motherPhone,
            fatherName: row.fatherName,
            fatherPhone: row.fatherPhone,
            address: row.address,
            note: row.note,
        });
    }

    if (values.length > 0) {
        await db
            .insert(studentPrivate)
            .values(values)
            .onConflictDoUpdate({
                target: studentPrivate.studentId,
                set: {
                    teacher: sql`excluded.teacher`,
                    birthDate: sql`excluded.birth_date`,
                    phone: sql`excluded.phone`,
                    motherName: sql`excluded.mother_name`,
                    motherPhone: sql`excluded.mother_phone`,
                    fatherName: sql`excluded.father_name`,
                    fatherPhone: sql`excluded.father_phone`,
                    address: sql`excluded.address`,
                    note: sql`excluded.note`,
                    updatedAt: sql`now()`,
                },
            });
    }

    await db.insert(adminLogs).values({
        action: 'import',
        summary: `교적 엑셀 가져오기: ${values.length}명 반영 (엑셀 ${rows.length}행)`,
        count: values.length,
        ip: clientIp(req),
    });

    return NextResponse.json({
        totalRows: rows.length,
        updated: values.length,
        looseMatches,
        unmatched,
        ambiguous,
        duplicates,
        studentsWithoutData: activeStudents.filter((s) => !matchedIds.has(s.id)).map((s) => s.name),
    });
});
