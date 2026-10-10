import { NextRequest, NextResponse } from 'next/server';

// Route Handler 공통 도우미 — 입력 검증과 오류 응답 형식({ error })을 통일

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export function badRequest(message: string): never {
    throw new ApiError(400, message);
}

// 처리 중 던진 ApiError는 해당 상태 코드로, 그 외 예외는 500으로 응답
export function withErrorHandling<A extends unknown[]>(
    handler: (req: NextRequest, ...args: A) => Promise<NextResponse>
) {
    return async (req: NextRequest, ...args: A): Promise<NextResponse> => {
        // 관리자 API(개인정보 포함 가능)는 응답을 캐시하지 않고, 오류 로그에 쿼리 값이 남지 않게 함
        const isAdminApi = req.nextUrl.pathname.startsWith('/api/admin/');
        const res = await (async () => {
            try {
                return await handler(req, ...args);
            } catch (err) {
                if (err instanceof ApiError) {
                    return NextResponse.json({ error: err.message }, { status: err.status });
                }
                // Postgres 외래키 위반 (존재하지 않는 학생에게 출석 기록 등) — Drizzle은 원래 오류를 cause에 담음
                const pgCode = (err as { code?: string; cause?: { code?: string } })?.cause?.code
                    ?? (err as { code?: string })?.code;
                if (pgCode === '23503') {
                    return NextResponse.json({ error: '존재하지 않는 학생입니다.' }, { status: 400 });
                }
                // Drizzle 오류 메시지에는 쿼리 파라미터(값)가 포함되므로 관리자 API는 종류만 기록
                console.error(
                    `[${req.method} ${req.nextUrl.pathname}]`,
                    isAdminApi ? { name: (err as Error)?.name, pgCode } : err
                );
                return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
            }
        })();
        if (isAdminApi) res.headers.set('Cache-Control', 'no-store');
        return res;
    };
}

export async function readJson(req: NextRequest): Promise<unknown> {
    try {
        return await req.json();
    } catch {
        badRequest('요청 본문이 올바른 JSON이 아닙니다.');
    }
}

// 단건 또는 배열 본문을 배열로
export function asList(body: unknown): unknown[] {
    return Array.isArray(body) ? body : [body];
}

export function asObject(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        badRequest('요청 항목은 객체여야 합니다.');
    }
    return value as Record<string, unknown>;
}

export function requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        badRequest(`${field}는 필수입니다.`);
    }
    return value;
}

// YYYY-MM-DD 형식이면서 실제 존재하는 날짜인지 확인
export function requireDate(value: unknown, field: string): string {
    const str = requireString(value, field);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (match) {
        const [, y, m, d] = match.map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
            return str;
        }
    }
    badRequest(`${field}는 YYYY-MM-DD 형식의 올바른 날짜여야 합니다.`);
}

export function requireInt(value: unknown, field: string, min = 0): number {
    const num = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof num !== 'number' || !Number.isInteger(num) || num < min) {
        badRequest(`${field}는 ${min} 이상의 정수여야 합니다.`);
    }
    return num;
}

export function requireBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') {
        badRequest(`${field}는 true 또는 false여야 합니다.`);
    }
    return value;
}

export function requireOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        badRequest(`${field}는 ${allowed.join(', ')} 중 하나여야 합니다.`);
    }
    return value as T;
}

export function optionalString(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') {
        badRequest(`${field}는 문자열이어야 합니다.`);
    }
    return value;
}
