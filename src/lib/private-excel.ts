import ExcelJS from 'exceljs';
import { badRequest } from '@/lib/api-utils';

// 교적 엑셀(예: "2026 DataBase" 시트를 엑셀로 내려받은 파일) 읽기
// 머리글 이름으로 열을 찾으므로 열 순서가 바뀌어도 됨 — '이름'과 '생년월일'이 있는 행을 머리글로 봄

export interface PrivateRow {
    name: string;
    gradeDigit?: string;
    teacher: string | null;
    birthDate: string | null; // YYYY-MM-DD
    phone: string | null;
    motherName: string | null;
    motherPhone: string | null;
    fatherName: string | null;
    fatherPhone: string | null;
    address: string | null;
    note: string | null;
}

const HEADERS = {
    name: '이름',
    grade: '학년',
    teacher: '선생님',
    birthDate: '생년월일',
    phone: '휴대폰',
    motherName: '모',
    motherPhone: '모휴대폰',
    fatherName: '부',
    fatherPhone: '부휴대폰',
    address: '주소',
    note: '비고',
} as const;

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

// 셀 값을 문자열로 — 수식은 결과값, 서식 있는 글자는 글자만, 오류(#N/A 등)는 빈 값
function cellString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
        // 엑셀 날짜는 UTC 자정으로 읽힘
        return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
    }
    if (typeof value === 'object') {
        if ('error' in value) return '';
        if ('result' in value) return cellString(value.result as ExcelJS.CellValue);
        if ('richText' in value) return value.richText.map((t) => t.text).join('').trim();
        if ('text' in value) return String(value.text).trim();
        return '';
    }
    return String(value).trim();
}

function toDate(raw: string): string | null {
    const m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(raw);
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
}

// 숫자만 남겨 010-1234-5678 형태로 (자리수가 다르면 입력값 그대로)
function toPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw.trim();
}

function orNull(raw: string): string | null {
    return raw === '' ? null : raw;
}

export async function readPrivateRows(buffer: ArrayBuffer): Promise<PrivateRow[]> {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(buffer);
    } catch {
        badRequest('엑셀(.xlsx) 파일을 읽을 수 없습니다.');
    }

    for (const sheet of workbook.worksheets) {
        // 앞쪽 20행 안에서 머리글 행 찾기
        for (let r = 1; r <= Math.min(20, sheet.rowCount); r++) {
            const headerRow = sheet.getRow(r);
            const columns: Partial<Record<keyof typeof HEADERS, number>> = {};
            headerRow.eachCell((cell, col) => {
                const label = cellString(cell.value).replace(/\s/g, '');
                for (const [key, header] of Object.entries(HEADERS)) {
                    if (label === header) columns[key as keyof typeof HEADERS] = col;
                }
            });
            if (!columns.name || !columns.birthDate) continue;

            const get = (row: ExcelJS.Row, key: keyof typeof HEADERS) =>
                columns[key] ? cellString(row.getCell(columns[key]!).value) : '';

            const rows: PrivateRow[] = [];
            for (let i = r + 1; i <= sheet.rowCount; i++) {
                const row = sheet.getRow(i);
                const name = get(row, 'name');
                if (!name) continue;
                const grade = /\d/.exec(get(row, 'grade'))?.[0];
                rows.push({
                    name,
                    gradeDigit: grade,
                    teacher: orNull(get(row, 'teacher')),
                    birthDate: toDate(get(row, 'birthDate')),
                    phone: toPhone(get(row, 'phone')),
                    motherName: orNull(get(row, 'motherName')),
                    motherPhone: toPhone(get(row, 'motherPhone')),
                    fatherName: orNull(get(row, 'fatherName')),
                    fatherPhone: toPhone(get(row, 'fatherPhone')),
                    address: orNull(get(row, 'address')),
                    note: orNull(get(row, 'note')),
                });
            }
            return rows;
        }
    }
    badRequest("'이름'과 '생년월일' 머리글이 있는 시트를 찾을 수 없습니다.");
}
