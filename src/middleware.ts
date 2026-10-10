import { NextRequest, NextResponse } from 'next/server';

// 관리자 전용 API의 1차 관문 — 비밀번호 헤더가 없으면 바로 거절
// 실제 비밀번호 확인과 시도 횟수 제한은 각 Route Handler의 requireAdmin(src/lib/admin-auth.ts)에서 함
// (여기서 틀린 비밀번호를 거절하면 실패 횟수가 기록되지 않아 대입 차단이 무력해지므로 헤더 유무만 확인)
const ADMIN_PASSWORD_HEADER = 'x-admin-password';

function isAdminRequest(req: NextRequest): boolean {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith('/api/admin/')) return true;
    return pathname === '/api/attendance' && req.method === 'DELETE';
}

export function middleware(req: NextRequest) {
    if (isAdminRequest(req) && !req.headers.get(ADMIN_PASSWORD_HEADER)) {
        return NextResponse.json({ error: '관리자 비밀번호가 필요합니다.' }, { status: 401 });
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/api/attendance', '/api/admin/:path*'],
};
