import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminAuthFailures } from '@/lib/schema';
import { ApiError } from '@/lib/api-utils';

// 관리자 비밀번호 확인 — 관리자 전용 Route Handler 안에서 호출 (middleware는 헤더 유무만 확인)
// 틀린 시도는 DB에 기록해 IP별·전체 횟수를 제한함 (서버 인스턴스가 여러 개여도 함께 적용)
export const ADMIN_PASSWORD_HEADER = 'x-admin-password';

// APP_PASSWORD를 설정하기 전까지만 쓰는 임시 비밀번호의 SHA-256 해시 (평문은 저장소에 두지 않음)
const TEMP_PASSWORD_HASH = 'c167f5386fc80de8286cffdb7ba8bc3d8b54fba104f2b6538457f61f43d12106';

const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_FAILURES = 5;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_MAX_FAILURES = 30;
const FAILURE_RETENTION_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): Buffer {
    return createHash('sha256').update(value).digest();
}

function clientIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function failureCount(since: Date, ip?: string): Promise<number> {
    const [row] = await db
        .select({ n: count() })
        .from(adminAuthFailures)
        .where(ip ? and(eq(adminAuthFailures.ip, ip), gte(adminAuthFailures.createdAt, since)) : gte(adminAuthFailures.createdAt, since));
    return row?.n ?? 0;
}

export async function requireAdmin(req: NextRequest): Promise<void> {
    const ip = clientIp(req);
    const now = Date.now();

    // 잠금 확인을 비밀번호 비교보다 먼저 — 잠긴 동안에는 맞는 비밀번호도 받지 않음
    const [ipFailures, globalFailures] = await Promise.all([
        failureCount(new Date(now - IP_WINDOW_MS), ip),
        failureCount(new Date(now - GLOBAL_WINDOW_MS)),
    ]);
    if (ipFailures >= IP_MAX_FAILURES) {
        throw new ApiError(429, '비밀번호를 여러 번 틀려 15분간 잠겼습니다. 잠시 후 다시 시도해 주세요.');
    }
    if (globalFailures >= GLOBAL_MAX_FAILURES) {
        throw new ApiError(429, '비밀번호 시도가 너무 많아 관리자 기능이 잠시 잠겼습니다. 1시간 후 다시 시도해 주세요.');
    }

    // 헤더에는 ASCII만 들어가므로 클라이언트가 encodeURIComponent로 보냄
    let given = '';
    try {
        given = decodeURIComponent(req.headers.get(ADMIN_PASSWORD_HEADER) ?? '');
    } catch {
        given = '';
    }

    const password = process.env.APP_PASSWORD;
    const expected = password ? sha256(password) : Buffer.from(TEMP_PASSWORD_HASH, 'hex');
    // 해시끼리 고정 시간 비교 (응답 시간으로 비밀번호를 추측하지 못하게)
    if (given && timingSafeEqual(sha256(given), expected)) {
        return;
    }

    await db.insert(adminAuthFailures).values({ ip });
    // 오래된 실패 기록 정리
    await db.delete(adminAuthFailures).where(lt(adminAuthFailures.createdAt, new Date(now - FAILURE_RETENTION_MS)));

    throw new ApiError(401, given ? '관리자 비밀번호가 올바르지 않습니다.' : '관리자 비밀번호가 필요합니다.');
}
