import { createHash, randomBytes } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, type DepartmentRow } from '@/lib/schema';
import { ApiError } from '@/lib/api-utils';

// 교사용 부서 출석 링크 — 로그인 없이 토큰만으로 그 부서 출석 입력을 허용
// DB에는 토큰의 해시만 저장하므로, 링크 원문은 만들 때 한 번만 보여 줄 수 있음

export function hashLinkToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function newLinkToken(): string {
    return randomBytes(24).toString('base64url');
}

// 토큰으로 부서를 찾음. 없거나 폐지된 부서면 404 (어떤 이유인지는 알려주지 않음)
export async function departmentFromToken(token: string): Promise<DepartmentRow> {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
        throw new ApiError(404, '출석 링크가 올바르지 않습니다. 담당 교역자에게 새 링크를 받아 주세요.');
    }
    const [dep] = await db
        .select()
        .from(departments)
        .where(
            and(
                eq(departments.linkTokenHash, hashLinkToken(token)),
                eq(departments.kind, 'school'),
                isNull(departments.archivedAt)
            )
        )
        .limit(1);
    if (!dep) {
        throw new ApiError(404, '출석 링크가 올바르지 않거나 교체되었습니다. 담당 교역자에게 새 링크를 받아 주세요.');
    }
    return dep;
}
