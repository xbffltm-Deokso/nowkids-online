import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { adminLogs, classes, grades, students } from '@/lib/schema';
import { badRequest, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { findDepartment } from '@/lib/department-admin';
import { isActiveStatus } from '@/utils/studentStatus';

// 반 편성 시트 — 부서 학생 목록을 엑셀로 받아 "새 반" 칸을 채워 다시 올리면 한 번에 반 배정
// GET  : 시트 내려받기 (학년·이름·성별·지금 반·새 반·ID)
// POST : form(file, apply='1'이면 반영) → 미리보기 또는 반영
//   - 새 반이 비어 있으면 그 학생은 그대로 둠, "미배정"이라고 쓰면 반을 뺌
//   - 학년이 있는 부서는 반 이름 앞에 학년을 붙여 학년별로 구분 (예: 4.믿음 1반)
//   - 없는 반은 새로 만듦
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const HEADERS = ['학년', '이름', '성별', '지금 반', '새 반', 'ID'] as const;

async function loadRoster(departmentId: string) {
    const [rows, gradeRows, classRows] = await Promise.all([
        db
            .select({
                id: students.id,
                name: students.name,
                gender: students.gender,
                status: students.status,
                gradeId: students.gradeId,
                classId: students.classId,
            })
            .from(students)
            .where(eq(students.departmentId, departmentId))
            .orderBy(asc(students.name)),
        db
            .select({ id: grades.id, name: grades.name, sortOrder: grades.sortOrder })
            .from(grades)
            .where(and(eq(grades.departmentId, departmentId), isNull(grades.archivedAt))),
        db
            .select({ id: classes.id, name: classes.name, sortOrder: classes.sortOrder })
            .from(classes)
            .where(and(eq(classes.departmentId, departmentId), isNull(classes.archivedAt))),
    ]);
    const gradeById = new Map(gradeRows.map((g) => [g.id, g]));
    const classById = new Map(classRows.map((c) => [c.id, c]));
    const active = rows
        .filter((s) => isActiveStatus(s.status))
        .sort(
            (a, b) =>
                (gradeById.get(a.gradeId ?? '')?.sortOrder ?? 0) - (gradeById.get(b.gradeId ?? '')?.sortOrder ?? 0) ||
                (classById.get(a.classId ?? '')?.sortOrder ?? 999) - (classById.get(b.classId ?? '')?.sortOrder ?? 999) ||
                a.name.localeCompare(b.name, 'ko-KR')
        );
    return { active, gradeById, classById, classRows };
}

// 화면에 보이는 반 이름 (학년 이름이 앞에 붙어 있으면 뗌)
function shortClass(className: string | undefined, gradeName: string | undefined): string {
    if (!className) return '';
    return gradeName && className.startsWith(`${gradeName} `) ? className.slice(gradeName.length + 1) : className;
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    const dep = await findDepartment(id);
    const { active, gradeById, classById } = await loadRoster(id);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('반 편성');
    sheet.columns = [
        { header: HEADERS[0], key: 'grade', width: 10 },
        { header: HEADERS[1], key: 'name', width: 12 },
        { header: HEADERS[2], key: 'gender', width: 6 },
        { header: HEADERS[3], key: 'current', width: 10 },
        { header: HEADERS[4], key: 'next', width: 10 },
        { header: HEADERS[5], key: 'id', width: 38 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    for (const s of active) {
        const gradeName = gradeById.get(s.gradeId ?? '')?.name;
        sheet.addRow({
            grade: gradeName ?? '',
            name: s.name,
            gender: s.gender === 'M' ? '남' : '여',
            current: shortClass(classById.get(s.classId ?? '')?.name, gradeName) || '미배정',
            next: '',
            id: s.id,
        });
    }
    // 새 반 칸 강조
    sheet.getColumn('next').eachCell((cell, row) => {
        if (row > 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } };
    });
    const info = workbook.addWorksheet('안내');
    info.addRows([
        ['부서', dep.name],
        ['쓰는 법', '"새 반" 칸에 1반, 2반처럼 적어 그대로 올려 주세요. 비워 두면 지금 반 그대로입니다.'],
        ['반 빼기', '"미배정"이라고 적으면 반에서 뺍니다.'],
        ['학년', '학년이 있는 부서는 학년별로 반이 따로 만들어집니다 (4.믿음 1반, 5.소망 1반은 다른 반).'],
        ['ID', 'ID 칸은 학생을 찾는 데 쓰니 지우거나 고치지 마세요.'],
    ]);
    info.getColumn(1).width = 10;
    info.getColumn(2).width = 90;

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `반편성_${dep.name}.xlsx`;
    return new NextResponse(buffer as ArrayBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
    });
});

function cellText(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
        if ('richText' in value) return value.richText.map((t) => t.text).join('').trim();
        if ('text' in value) return String(value.text).trim();
        return '';
    }
    return String(value).trim();
}

// "1" → "1반", " 2 반" → "2반"
function normalizeClass(raw: string): string {
    const v = raw.replace(/\s+/g, ' ').trim();
    if (/^\d+$/.test(v)) return `${v}반`;
    return v.replace(/(\d+)\s+반$/, '$1반');
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req);
    const { id } = await params;
    const dep = await findDepartment(id);

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    const apply = form?.get('apply') === '1';
    if (!(file instanceof File)) badRequest('반 편성 시트를 선택해 주세요.');
    if (file.size > MAX_FILE_BYTES) badRequest('파일이 너무 큽니다 (5MB까지).');

    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(await file.arrayBuffer());
    } catch {
        badRequest('엑셀(.xlsx) 파일을 읽을 수 없습니다. 구글 시트는 파일 → 다운로드 → Microsoft Excel(.xlsx)로 받아 주세요.');
    }

    // 머리글 행 찾기: '이름'과 '새 반'(또는 '반')
    let found: { sheet: ExcelJS.Worksheet; row: number; col: Record<string, number> } | null = null;
    for (const sheet of workbook.worksheets) {
        for (let r = 1; r <= Math.min(10, sheet.rowCount) && !found; r++) {
            const col: Record<string, number> = {};
            sheet.getRow(r).eachCell((cell, c) => {
                col[cellText(cell.value).replace(/\s/g, '')] = c;
            });
            if (col['이름'] && (col['새반'] || col['반'])) found = { sheet, row: r, col };
        }
        if (found) break;
    }
    if (!found) badRequest("'이름'과 '새 반' 머리글을 찾을 수 없습니다. 내려받은 반 편성 시트를 그대로 써 주세요.");
    const { sheet, row: headerRow, col } = found;
    const classCol = col['새반'] ?? col['반'];

    const { active, gradeById, classById, classRows } = await loadRoster(id);
    const byId = new Map(active.map((s) => [s.id, s]));

    const changes: { studentId: string; name: string; from: string; to: string; target: string | null }[] = [];
    const unmatched: string[] = [];
    const ambiguous: string[] = [];
    const seen = new Set<string>();
    let unchanged = 0;

    for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const name = cellText(row.getCell(col['이름']).value);
        const raw = cellText(row.getCell(classCol).value);
        if (!name || !raw) continue; // 새 반이 비면 그대로
        const idText = col['ID'] ? cellText(row.getCell(col['ID']).value) : '';
        let student = idText ? byId.get(idText) : undefined;
        if (!student) {
            const same = active.filter((s) => s.name === name);
            if (same.length > 1) {
                ambiguous.push(name);
                continue;
            }
            student = same[0];
        }
        if (!student) {
            unmatched.push(name);
            continue;
        }
        if (seen.has(student.id)) continue;
        seen.add(student.id);

        const gradeName = gradeById.get(student.gradeId ?? '')?.name;
        const currentShort = shortClass(classById.get(student.classId ?? '')?.name, gradeName) || '미배정';
        const value = normalizeClass(raw);
        if (value === '미배정') {
            if (student.classId) changes.push({ studentId: student.id, name: student.name, from: currentShort, to: '미배정', target: null });
            else unchanged++;
            continue;
        }
        // 학년이 있으면 학년별 반 이름으로
        const target = gradeName && !value.startsWith(`${gradeName} `) ? `${gradeName} ${value}` : value;
        if (classById.get(student.classId ?? '')?.name === target) {
            unchanged++;
            continue;
        }
        changes.push({ studentId: student.id, name: student.name, from: currentShort, to: shortClass(target, gradeName), target });
    }

    const existingNames = new Set(classRows.map((c) => c.name));
    const newClasses = [...new Set(changes.map((c) => c.target).filter((t): t is string => !!t && !existingNames.has(t)))];

    const preview = {
        department: dep.name,
        changes: changes.map(({ name, from, to }) => ({ name, from, to })),
        newClasses,
        unchanged,
        unmatched,
        ambiguous,
        applied: false,
    };
    if (!apply || changes.length === 0) return NextResponse.json(preview);

    // 새 반 만들기 (이름 순서대로 뒤에 붙임)
    const base = classRows.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    const created = newClasses.length
        ? await db
              .insert(classes)
              .values(
                  [...newClasses]
                      .sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }))
                      .map((name, i) => ({ departmentId: id, name, sortOrder: base + i + 1 }))
              )
              .returning({ id: classes.id, name: classes.name })
        : [];
    const classIdByName = new Map([...classRows, ...created].map((c) => [c.name, c.id]));

    // 반별로 묶어 한 번에 갱신 (예전 반 번호 칸도 맞춤)
    const groups = new Map<string | null, string[]>();
    for (const c of changes) {
        const key = c.target ? classIdByName.get(c.target) ?? null : null;
        groups.set(key, [...(groups.get(key) ?? []), c.studentId]);
    }
    const nameOfClass = new Map([...classRows, ...created].map((c) => [c.id, c.name]));
    const queries = [...groups.entries()].map(([classId, ids]) =>
        db
            .update(students)
            .set({ classId, classNum: classId ? Number(/(\d+)\s*반/.exec(nameOfClass.get(classId) ?? '')?.[1] ?? 0) : 0 })
            .where(inArray(students.id, ids))
    );
    queries.push(
        db.insert(adminLogs).values({
            action: 'department',
            summary: `${dep.name} 반 편성 시트 반영: ${changes.length}명${newClasses.length ? `, 새 반 ${newClasses.length}개` : ''}`,
            count: changes.length,
            ip: clientIp(req),
        }) as never
    );
    await db.batch(queries as [(typeof queries)[number], ...typeof queries]);

    return NextResponse.json({ ...preview, applied: true });
});
