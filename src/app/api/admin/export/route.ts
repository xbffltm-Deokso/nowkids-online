import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { adminLogs, students, studentPrivate } from '@/lib/schema';
import { asObject, readJson, requireString, withErrorHandling } from '@/lib/api-utils';
import { clientIp, requireAdmin } from '@/lib/admin-auth';
import { computeAttendanceSummaries } from '@/lib/attendance-groups';
import { isActiveStatus } from '@/utils/studentStatus';

// POST /api/admin/export { grade: "6.사랑" | "all" } — 진급자 DB 엑셀 (개인정보 + 최근 52주 출석률·그룹)
// 첫 행이 머리글이라 추출한 파일을 그대로 "교적 엑셀 가져오기"에 다시 쓸 수 있음
const COLUMNS: { header: string; key: string; width: number }[] = [
    { header: '이름', key: 'name', width: 10 },
    { header: '학년', key: 'grade', width: 8 },
    { header: '반', key: 'classNum', width: 5 },
    { header: '성별', key: 'gender', width: 5 },
    { header: '선생님', key: 'teacher', width: 14 },
    { header: '출석률', key: 'rate', width: 8 },
    { header: '출석그룹', key: 'group', width: 8 },
    { header: '출석주', key: 'weeks', width: 8 },
    { header: '생년월일', key: 'birthDate', width: 12 },
    { header: '휴대폰', key: 'phone', width: 14 },
    { header: '모', key: 'motherName', width: 8 },
    { header: '모휴대폰', key: 'motherPhone', width: 14 },
    { header: '부', key: 'fatherName', width: 8 },
    { header: '부휴대폰', key: 'fatherPhone', width: 14 },
    { header: '주소', key: 'address', width: 40 },
    { header: '비고', key: 'note', width: 16 },
];

export const POST = withErrorHandling(async (req: NextRequest) => {
    await requireAdmin(req);
    const grade = requireString(asObject(await readJson(req)).grade, 'grade');

    const [rows, groups] = await Promise.all([
        db
            .select({ student: students, private: studentPrivate })
            .from(students)
            .leftJoin(studentPrivate, eq(studentPrivate.studentId, students.id))
            .where(grade === 'all' ? undefined : eq(students.grade, grade))
            .orderBy(asc(students.grade), asc(students.classNum), asc(students.name)),
        computeAttendanceSummaries(),
    ]);
    const active = rows.filter((r) => isActiveStatus(r.student.status));
    const summaryOf = new Map(groups.summaries.map((s) => [s.studentId, s]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('진급자 DB');
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    for (const { student, private: p } of active) {
        const summary = summaryOf.get(student.id);
        sheet.addRow({
            name: student.name,
            grade: student.grade,
            classNum: student.classNum,
            gender: student.gender === 'M' ? '남' : '여',
            teacher: p?.teacher ?? '',
            rate: summary?.rate !== null && summary?.rate !== undefined ? `${summary.rate}%` : '',
            group: summary?.group ?? '',
            weeks: summary && summary.weeks > 0 ? `${summary.present}/${summary.weeks}` : '',
            birthDate: p?.birthDate ?? '',
            phone: p?.phone ?? '',
            motherName: p?.motherName ?? '',
            motherPhone: p?.motherPhone ?? '',
            fatherName: p?.fatherName ?? '',
            fatherPhone: p?.fatherPhone ?? '',
            address: p?.address ?? '',
            note: p?.note ?? '',
        });
    }

    const info = workbook.addWorksheet('안내');
    info.addRows([
        ['대상', grade === 'all' ? '전체 학년' : grade],
        ['인원', active.length],
        ['출석률 기간', `${groups.from} ~ ${groups.to} 중 출석부를 쓴 ${groups.countedWeeks}주 (처음 온 날 이후만)`],
        ['출석그룹', 'A 80% 이상, B 60% 이상, C 40% 이상, D 20% 이상, E 20% 미만'],
        ['주의', '학생 개인정보가 포함된 파일입니다. 필요한 사람에게만 전달하고 사용 후 삭제해 주세요.'],
    ]);
    info.getColumn(1).width = 12;
    info.getColumn(2).width = 80;

    const buffer = await workbook.xlsx.writeBuffer();

    await db.insert(adminLogs).values({
        action: 'export',
        summary: `진급자 DB 추출: ${grade === 'all' ? '전체 학년' : grade} ${active.length}명`,
        count: active.length,
        ip: clientIp(req),
    });

    const fileName = `진급자DB_${grade === 'all' ? '전체' : grade}_${groups.to}.xlsx`;
    return new NextResponse(buffer as ArrayBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
    });
});
