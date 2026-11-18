import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminLogs, departments, grades, students, studentPrivate } from '@/lib/schema';
import { ApiError, badRequest, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { UUID_RE } from '@/lib/department-admin';
import { countingAge, readCh2chRoster, RosterRow } from '@/lib/ch2ch-roster';
import { baseName, couldBeSame, matchStudent } from '@/lib/student-matching';
import { isActiveStatus } from '@/utils/studentStatus';

// POST /api/admin/roster-sync — 부서를 고르고 ch2ch 교육기관 명단(.xls)으로 그 부서 학생을 맞춤
// form: file, departmentId, apply('1'이면 반영, 아니면 미리보기만), createGrades('1'이면 없는 학년을 만듦)
// - 명단에 있고 앱에 있음 → 개인정보·학년 갱신 (다른 부서에 있던 학생이면 이 부서로 이동)
// - 명단에만 있음 → 이 부서 학생으로 추가
// - 앱의 이 부서에만 있음 → 지우지 않고 "교적 등록 필요" 표시
// 응답에는 개인정보 값 없이 이름·인원만 담음
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface PreviewItem {
    name: string;
    sub: string | null;
    note?: string;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
    await requireAdmin(req);

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    const departmentId = String(form?.get('departmentId') ?? '');
    const apply = form?.get('apply') === '1';
    const createGrades = form?.get('createGrades') === '1';
    if (!(file instanceof File)) badRequest('명단 파일을 선택해 주세요.');
    if (file.size > MAX_FILE_BYTES) badRequest('파일이 너무 큽니다 (5MB까지).');
    if (!UUID_RE.test(departmentId)) badRequest('부서를 선택해 주세요.');

    const [dep] = await db
        .select()
        .from(departments)
        .where(and(eq(departments.id, departmentId), isNull(departments.archivedAt)));
    if (!dep || dep.kind !== 'school') throw new ApiError(404, '학생 출석 부서를 찾을 수 없습니다.');

    const roster = readCh2chRoster(await file.arrayBuffer());
    if (roster.rows.length === 0) badRequest('명단에 학생이 없습니다.');

    // 파일 이름의 기관명([덕소]소년부)이 고른 부서와 다르면 경고
    const orgInName = /\[[^\]]+\][^\s_.]+?(?=리스트|명단|요람|\.|_|\s|$)/.exec(file.name)?.[0] ?? null;
    const orgWarning =
        orgInName && dep.ch2chOrgName && orgInName !== dep.ch2chOrgName
            ? `파일 이름의 기관(${orgInName})과 고른 부서의 ch2ch 기관명(${dep.ch2chOrgName})이 다릅니다.`
            : null;

    // 학년: 명단 "반" 값 → 부서 학년의 ch2ch 하위 이름
    const gradeRows = await db
        .select({ id: grades.id, name: grades.name, sub: grades.ch2chSubName, sortOrder: grades.sortOrder })
        .from(grades)
        .where(and(eq(grades.departmentId, departmentId), isNull(grades.archivedAt)));
    const gradeBySub = new Map(gradeRows.filter((g) => g.sub).map((g) => [g.sub!, g]));
    const rosterSubs = [...new Set(roster.rows.map((r) => r.sub).filter((s): s is string => !!s))];
    const unknownSubs = gradeRows.length > 0 || createGrades ? rosterSubs.filter((s) => !gradeBySub.has(s)) : [];

    // 이름 맞추기: 재적 학생 전체(다른 부서 포함)에서 — 동명이인은 생일로 좁힘
    const all = await db
        .select({ student: students, birthDate: studentPrivate.birthDate })
        .from(students)
        .leftJoin(studentPrivate, eq(studentPrivate.studentId, students.id));
    const active = all.filter((r) => isActiveStatus(r.student.status));
    const candidates = active.map((r) => ({ ...r.student, birthDate: r.birthDate }));

    type Matched = { row: RosterRow; student: (typeof candidates)[number]; loose: boolean };
    const matched: Matched[] = [];
    const added: RosterRow[] = [];
    const ambiguous: PreviewItem[] = [];
    const duplicates: PreviewItem[] = [];
    const usedIds = new Set<string>();

    for (const row of roster.rows) {
        const gradeDigit = /\d/.exec(row.sub ?? '')?.[0];
        // 같은 사람 후보:
        // - 이 부서 학생: 생년월일이 둘 다 있는데 서로 다르면 제외
        // - 다른 부서 학생: 생년월일이 같을 때만 (이름만 같은 다른 아이를 옮기지 않게)
        let pool = candidates.filter((c) =>
            c.departmentId === departmentId
                ? !(row.birthDate && c.birthDate && c.birthDate !== row.birthDate)
                : !!row.birthDate && c.birthDate === row.birthDate
        );
        if (row.birthDate) {
            const sameName = pool.filter((c) => couldBeSame(c.name, row.name));
            const sameBirth = sameName.filter((c) => c.birthDate === row.birthDate);
            if (sameName.length > 1 && sameBirth.length === 1) pool = sameBirth;
        }
        // 같은 명단에 알파벳만 다른 이름(김하준A·김하준B)이 있으면 표기가 다른 이름은 연결하지 않음
        const hasRival = roster.rows.some((o) => o !== row && o.name !== row.name && baseName(o.name) === baseName(row.name));
        const result = matchStudent(pool, row.name, gradeDigit, !hasRival);
        if (result.kind === 'ambiguous') {
            ambiguous.push({ name: row.name, sub: row.sub });
            continue;
        }
        if (result.kind === 'none') {
            added.push(row);
            continue;
        }
        if (usedIds.has(result.student.id)) {
            duplicates.push({ name: row.name, sub: row.sub });
            continue;
        }
        usedIds.add(result.student.id);
        matched.push({ row, student: result.student, loose: result.kind === 'loose' });
    }

    const moved = matched.filter((m) => m.student.departmentId !== departmentId);
    const missing = active.filter((r) => r.student.departmentId === departmentId && !usedIds.has(r.student.id));

    // 대상 나이를 벗어난 학생 (세는 나이)
    const year = new Date(Date.now() + 9 * 3600 * 1000).getUTCFullYear();
    const ageWarnings: PreviewItem[] = [];
    if (dep.ageMin !== null || dep.ageMax !== null) {
        for (const row of roster.rows) {
            if (!row.birthDate) continue;
            const age = countingAge(row.birthDate, year);
            if ((dep.ageMin !== null && age < dep.ageMin) || (dep.ageMax !== null && age > dep.ageMax)) {
                ageWarnings.push({ name: row.name, sub: row.sub, note: `${age}세` });
            }
        }
    }

    const preview = {
        department: dep.name,
        orgWarning,
        totalRows: roster.rows.length,
        teachersSkipped: roster.teachersSkipped,
        subs: rosterSubs.map((s) => ({
            sub: s,
            count: roster.rows.filter((r) => r.sub === s).length,
            grade: gradeBySub.get(s)?.name ?? null,
        })),
        unknownSubs,
        matched: matched.length,
        looseMatches: matched.filter((m) => m.loose).map((m) => ({ name: m.row.name, sub: m.row.sub, note: m.student.name })),
        moved: moved.map((m) => ({ name: m.row.name, sub: m.row.sub, note: m.student.grade })),
        added: added.map((r) => ({ name: r.name, sub: r.sub })),
        missing: missing.map((r) => ({ name: r.student.name, sub: null, note: r.student.grade })),
        ambiguous,
        duplicates,
        ageWarnings,
        // 명단에서 성별을 알 수 없는 새 학생 (요람에서 학생이 세대주인 경우 등) — 남으로 저장되니 확인 필요
        genderUnknown: added.filter((r) => !r.gender).map((r) => ({ name: r.name, sub: r.sub })),
        applied: false,
    };

    if (!apply) return NextResponse.json(preview);

    // ── 반영 ──
    // 1) 없는 학년 만들기 (고른 경우)
    if (createGrades && unknownSubs.length > 0) {
        const base = gradeRows.reduce((m, g) => Math.max(m, g.sortOrder), 0);
        const created = await db
            .insert(grades)
            .values(unknownSubs.map((s, i) => ({ departmentId, name: s, ch2chSubName: s, sortOrder: base + i + 1 })))
            .returning({ id: grades.id, name: grades.name, sub: grades.ch2chSubName, sortOrder: grades.sortOrder });
        for (const g of created) gradeBySub.set(g.sub!, g);
    }
    const gradeOf = (row: RosterRow) => (row.sub ? gradeBySub.get(row.sub) ?? null : null);

    const privateOf = (studentId: string, row: RosterRow) => ({
        studentId,
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

    const queries = [];
    // 2) 맞춘 학생: 부서·학년 갱신(학년이 바뀌면 반은 미배정으로), 새친구는 재학으로, 등록 필요 해제
    for (const m of matched) {
        const g = gradeOf(m.row);
        const moving = m.student.departmentId !== departmentId;
        const gradeChanged = g ? g.id !== m.student.gradeId : false;
        queries.push(
            db
                .update(students)
                .set({
                    departmentId,
                    ...(g ? { gradeId: g.id, grade: g.name } : moving ? { gradeId: null, grade: dep.name } : {}),
                    ...(moving || gradeChanged ? { classId: null, classNum: 0 } : {}),
                    ...(m.student.status === '새친구' ? { status: '재학' } : {}),
                    needsRegistration: false,
                    ...(m.row.gender && m.student.gender !== m.row.gender ? { gender: m.row.gender } : {}),
                })
                .where(eq(students.id, m.student.id))
        );
    }
    // 3) 새 학생
    const newStudents = added.map((row) => {
        const g = gradeOf(row);
        return {
            id: crypto.randomUUID(),
            row,
            values: {
                grade: g?.name ?? dep.name,
                classNum: 0,
                number: 0,
                name: row.name,
                gender: row.gender ?? 'M',
                status: '재학',
                departmentId,
                gradeId: g?.id ?? null,
                classId: null,
                source: 'import',
            },
        };
    });
    if (newStudents.length > 0) {
        queries.push(db.insert(students).values(newStudents.map((n) => ({ id: n.id, ...n.values }))));
    }
    // 4) 개인정보 (맞춘 학생 + 새 학생)
    const privateRows = [
        ...matched.map((m) => privateOf(m.student.id, m.row)),
        ...newStudents.map((n) => privateOf(n.id, n.row)),
    ];
    if (privateRows.length > 0) {
        queries.push(
            db
                .insert(studentPrivate)
                .values(privateRows)
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
                })
        );
    }
    // 5) 명단에 없는 이 부서 학생 → 교적 등록 필요 (지우지 않음)
    if (missing.length > 0) {
        queries.push(
            db
                .update(students)
                .set({ needsRegistration: true })
                .where(inArray(students.id, missing.map((r) => r.student.id)))
        );
    }
    queries.push(
        db.insert(adminLogs).values({
            action: 'import',
            summary: `${dep.name} 교적 명단 동기화: 갱신 ${matched.length}명(이동 ${moved.length}), 추가 ${newStudents.length}명, 등록 필요 ${missing.length}명`,
            count: matched.length + newStudents.length,
            ip: clientIp(req),
        })
    );
    await db.batch(queries as [(typeof queries)[number], ...typeof queries]);

    return NextResponse.json({ ...preview, unknownSubs: createGrades ? [] : unknownSubs, applied: true });
});
