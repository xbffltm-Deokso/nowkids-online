import { badRequest } from '@/lib/api-utils';

// ch2ch "교육기관 명단" 내려받기 파일(.xls) 읽기
// 확장자는 xls지만 실제 내용은 HTML 표 — 머리글: 번호|반|교사|교사휴대폰|이름|가족관계|성별|생일|양음|휴대폰|주소|행정분류|학교|학년|신급|부모|출/결|출석율
// "반" 칸이 학년(예: 4학년)이고, 반이 "교사"인 줄은 선생님이라 건너뜀

export interface RosterRow {
    name: string;
    sub: string | null; // ch2ch 하위 이름(예: "4학년") — 부서의 학년과 맞춤
    gender: 'M' | 'F' | null;
    birthDate: string | null; // YYYY-MM-DD
    teacher: string | null;
    phone: string | null;
    address: string | null;
    motherName: string | null;
    motherPhone: string | null;
    fatherName: string | null;
    fatherPhone: string | null;
    note: string | null; // 행정분류·신급·학교
}

export interface Roster {
    rows: RosterRow[];
    teachersSkipped: number;
}

function decode(buffer: ArrayBuffer): string {
    const head = new TextDecoder('latin1').decode(buffer.slice(0, 2000)).toLowerCase();
    const charset = /charset=["']?(euc-kr|ks_c_5601-1987|cp949)/.exec(head) ? 'euc-kr' : 'utf-8';
    return new TextDecoder(charset).decode(buffer);
}

function text(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function toDate(raw: string): string | null {
    const m = /^(\d{4})\D*(\d{1,2})\D*(\d{1,2})$/.exec(raw.replace(/\s/g, ''));
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
}

function toPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw.trim() || null;
}

const MOTHER = /처|모|어머니|엄마|아내|부인/;
const FATHER = /세대주|부$|아버지|아빠|남편/;

// 부모 칸: <font>이름</font> <span>가족관계</span> 전화 <span>[직분]/교구/구역</span> &nbsp; ... 반복
function parseParents(html: string) {
    const people: { name: string; relation: string; phone: string | null }[] = [];
    const re = /<font[^>]*>([\s\S]*?)<\/font>\s*(?:<span[^>]*>([\s\S]*?)<\/span>)?\s*([0-9-]{9,})?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
        const name = text(m[1]);
        if (name) people.push({ name, relation: text(m[2] ?? ''), phone: m[3] ? toPhone(m[3]) : null });
    }
    let mother = people.find((p) => MOTHER.test(p.relation));
    let father = people.find((p) => p !== mother && FATHER.test(p.relation));
    // 관계로 알 수 없으면 남은 사람을 순서대로 (교적은 대개 세대주 → 배우자 순)
    const rest = people.filter((p) => p !== mother && p !== father);
    if (!father && rest.length) father = rest.shift();
    if (!mother && rest.length) mother = rest.shift();
    return {
        fatherName: father?.name ?? null,
        fatherPhone: father?.phone ?? null,
        motherName: mother?.name ?? null,
        motherPhone: mother?.phone ?? null,
    };
}

export function readCh2chRoster(buffer: ArrayBuffer): Roster {
    const html = decode(buffer).replace(/<!--[\s\S]*?-->/g, '');
    if (!/<table/i.test(html)) {
        badRequest('ch2ch 교육기관 명단 파일(.xls)이 아닙니다. ch2ch에서 내려받은 파일을 그대로 올려 주세요.');
    }

    const rows = html
        .split(/<tr[^>]*>/i)
        .slice(1)
        .map((tr) => tr.split(/<t[dh][^>]*>/i).slice(1).map((cell) => cell.replace(/<\/t[dh]>[\s\S]*$/i, '')));

    const headerIndex = rows.findIndex((r) => r.map(text).includes('이름') && r.map(text).includes('반'));
    if (headerIndex < 0) {
        // 요람(가정별 카드·사진) 형식은 표 구조가 달라 읽지 않음
        if (/seq_mark|pswp|요람/.test(html)) {
            badRequest(
                "'요람' 형식 파일입니다. ch2ch 교육기관 화면에서 '리스트(명단)'로 내려받은 파일을 올려 주세요. (예: 2026년[덕소]고등부리스트.xls)"
            );
        }
        badRequest("명단에서 '이름'·'반' 머리글을 찾을 수 없습니다. ch2ch 교육기관 '리스트'로 내려받은 파일인지 확인해 주세요.");
    }
    const header = rows[headerIndex].map(text);
    const col = (label: string) => header.indexOf(label);
    const idx = {
        sub: col('반'),
        teacher: col('교사'),
        name: col('이름'),
        gender: col('성별'),
        birth: col('생일'),
        phone: col('휴대폰'),
        address: col('주소'),
        kind: col('행정분류'),
        school: col('학교'),
        faith: col('신급'),
        parents: col('부모'),
    };

    const out: RosterRow[] = [];
    let teachersSkipped = 0;
    for (const raw of rows.slice(headerIndex + 1)) {
        const cell = (i: number) => (i >= 0 && i < raw.length ? text(raw[i]) : '');
        const name = cell(idx.name);
        if (!name) continue;
        const sub = cell(idx.sub);
        if (sub === '교사') {
            teachersSkipped++;
            continue;
        }
        const gender = cell(idx.gender);
        const parents = idx.parents >= 0 && idx.parents < raw.length ? parseParents(raw[idx.parents]) : null;
        const note = [cell(idx.kind), cell(idx.faith), cell(idx.school)].filter(Boolean).join(' · ');
        out.push({
            name,
            sub: sub || null,
            gender: gender === '남' ? 'M' : gender === '여' ? 'F' : null,
            birthDate: toDate(cell(idx.birth)),
            teacher: cell(idx.teacher) || null,
            phone: toPhone(cell(idx.phone)),
            address: cell(idx.address) || null,
            motherName: parents?.motherName ?? null,
            motherPhone: parents?.motherPhone ?? null,
            fatherName: parents?.fatherName ?? null,
            fatherPhone: parents?.fatherPhone ?? null,
            note: note || null,
        });
    }
    return { rows: out, teachersSkipped };
}

// 주일보고서와 같은 세는 나이 (올해 - 태어난 해 + 1)
export function countingAge(birthDate: string, year: number): number {
    return year - Number(birthDate.slice(0, 4)) + 1;
}
