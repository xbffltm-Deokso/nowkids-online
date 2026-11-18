import { eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, divisions } from '@/lib/schema';
import { ApiError, badRequest, optionalString } from '@/lib/api-utils';

// 부서 관리(만들기·고치기) 입력 검증 — 개편(통합·분리·폐지)을 교역자가 직접 반영할 수 있게

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ['school', 'report_only'] as const;

export interface DepartmentInput {
    name?: string;
    divisionId?: string;
    kind?: (typeof KINDS)[number];
    serviceTime?: string | null;
    ageMin?: number | null;
    ageMax?: number | null;
    sortOrder?: number;
    nextDepartmentId?: string | null;
    ch2chOrgName?: string | null;
    archived?: boolean;
}

function optionalAge(value: unknown, field: string): number | null {
    if (value === undefined || value === null || value === '') return null;
    const n = typeof value === 'string' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 120) {
        badRequest(`${field}는 0~120 사이 정수여야 합니다.`);
    }
    return n;
}

// body에 들어 있는 항목만 검증해서 돌려줌 (PATCH는 일부만 보냄)
export function parseDepartmentInput(body: Record<string, unknown>): DepartmentInput {
    const out: DepartmentInput = {};
    if ('name' in body) {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 30) badRequest('부서 이름은 1~30자로 입력해 주세요.');
        out.name = name;
    }
    if ('divisionId' in body) {
        if (typeof body.divisionId !== 'string' || !UUID_RE.test(body.divisionId)) badRequest('교육부를 선택해 주세요.');
        out.divisionId = body.divisionId;
    }
    if ('kind' in body) {
        if (!KINDS.includes(body.kind as never)) badRequest('부서 종류가 올바르지 않습니다.');
        out.kind = body.kind as DepartmentInput['kind'];
    }
    if ('serviceTime' in body) {
        out.serviceTime = optionalString(body.serviceTime, '예배 시간')?.trim().slice(0, 20) || null;
    }
    if ('ageMin' in body) out.ageMin = optionalAge(body.ageMin, '시작 나이');
    if ('ageMax' in body) out.ageMax = optionalAge(body.ageMax, '끝 나이');
    if ('sortOrder' in body) {
        const n = Number(body.sortOrder);
        if (!Number.isInteger(n) || n < 0 || n > 1000) badRequest('순서는 0~1000 사이 정수여야 합니다.');
        out.sortOrder = n;
    }
    if ('nextDepartmentId' in body) {
        const v = body.nextDepartmentId;
        if (v !== null && v !== '' && (typeof v !== 'string' || !UUID_RE.test(v))) {
            badRequest('다음 부서가 올바르지 않습니다.');
        }
        out.nextDepartmentId = (v as string) || null;
    }
    if ('ch2chOrgName' in body) {
        out.ch2chOrgName = optionalString(body.ch2chOrgName, 'ch2ch 기관명')?.trim().slice(0, 50) || null;
    }
    if ('archived' in body) {
        if (typeof body.archived !== 'boolean') badRequest('폐지 여부가 올바르지 않습니다.');
        out.archived = body.archived;
    }
    return out;
}

// 저장 전 다른 행과의 관계 검증: 나이 범위, 같은 교육부 안 이름 중복, ch2ch 기관명 중복,
// 다음 부서(자기 자신·폐지 부서·순환 금지)
export async function validateDepartment(
    id: string | null,
    merged: {
        name: string;
        divisionId: string;
        ageMin: number | null;
        ageMax: number | null;
        nextDepartmentId: string | null;
        ch2chOrgName: string | null;
    }
): Promise<void> {
    if (merged.ageMin !== null && merged.ageMax !== null && merged.ageMin > merged.ageMax) {
        badRequest('시작 나이가 끝 나이보다 클 수 없습니다.');
    }

    const [division] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.id, merged.divisionId));
    if (!division) badRequest('교육부를 찾을 수 없습니다.');

    const others = await db
        .select({
            id: departments.id,
            name: departments.name,
            divisionId: departments.divisionId,
            next: departments.nextDepartmentId,
            ch2chOrgName: departments.ch2chOrgName,
            archivedAt: departments.archivedAt,
        })
        .from(departments)
        .where(id ? ne(departments.id, id) : undefined);

    if (others.some((d) => d.divisionId === merged.divisionId && d.name === merged.name)) {
        throw new ApiError(409, `같은 교육부에 "${merged.name}" 부서가 이미 있습니다. 폐지한 부서라면 다시 살려 주세요.`);
    }
    if (merged.ch2chOrgName) {
        const clash = others.find((d) => d.ch2chOrgName === merged.ch2chOrgName && !d.archivedAt);
        if (clash) throw new ApiError(409, `ch2ch 기관명 "${merged.ch2chOrgName}"은 ${clash.name}에서 쓰고 있습니다.`);
    }

    if (merged.nextDepartmentId) {
        if (merged.nextDepartmentId === id) badRequest('다음 부서로 자기 자신을 고를 수 없습니다.');
        const byId = new Map(others.map((d) => [d.id, d]));
        const target = byId.get(merged.nextDepartmentId);
        if (!target) badRequest('다음 부서를 찾을 수 없습니다.');
        if (target.archivedAt) badRequest('폐지한 부서는 다음 부서로 고를 수 없습니다.');
        // 다음 부서를 따라가다 자기 자신으로 돌아오면 진급이 끝나지 않음
        let cur: string | null = merged.nextDepartmentId;
        for (let i = 0; cur && i <= others.length; i++) {
            if (id && byId.get(cur)?.next === id) {
                badRequest('다음 부서를 따라가면 이 부서로 되돌아옵니다. 진급 순서를 확인해 주세요.');
            }
            cur = byId.get(cur)?.next ?? null;
        }
    }
}

export async function findDepartment(id: string) {
    if (!UUID_RE.test(id)) throw new ApiError(404, '부서를 찾을 수 없습니다.');
    const [dep] = await db.select().from(departments).where(eq(departments.id, id));
    if (!dep) throw new ApiError(404, '부서를 찾을 수 없습니다.');
    return dep;
}

