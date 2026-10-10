import { NextRequest, NextResponse } from 'next/server';

// 출석 기록 삭제(DELETE /api/attendance)만 관리자 비밀번호(APP_PASSWORD)로 보호
// 페이지는 모두 공개 — 관리자 화면에서 삭제가 포함된 저장을 할 때 비밀번호를 입력받아 헤더로 보냄
const ADMIN_PASSWORD_HEADER = 'x-admin-password';

// APP_PASSWORD 환경변수를 설정하기 전까지만 쓰는 임시 비밀번호의 SHA-256 해시 (평문은 저장소에 두지 않음)
// APP_PASSWORD를 설정하면 이 임시 비밀번호는 더 이상 통하지 않음
const TEMP_PASSWORD_HASH = 'c167f5386fc80de8286cffdb7ba8bc3d8b54fba104f2b6538457f61f43d12106';

async function sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req: NextRequest) {
    if (req.method !== 'DELETE') {
        return NextResponse.next();
    }

    const password = process.env.APP_PASSWORD;
    const expected = password ? await sha256(password) : TEMP_PASSWORD_HASH;
    // 헤더에는 ASCII만 들어가므로 클라이언트가 encodeURIComponent로 보냄
    let given: string | null = null;
    try {
        const raw = req.headers.get(ADMIN_PASSWORD_HEADER);
        given = raw === null ? null : decodeURIComponent(raw);
    } catch {
        given = '';
    }

    if (given && (await sha256(given)) === expected) {
        return NextResponse.next();
    }

    return NextResponse.json(
        { error: given ? '관리자 비밀번호가 올바르지 않습니다.' : '관리자 비밀번호가 필요합니다.' },
        { status: 401 }
    );
}

export const config = {
    matcher: ['/api/attendance'],
};
