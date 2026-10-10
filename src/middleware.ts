import { NextRequest, NextResponse } from 'next/server';

// 사이트 전체를 비밀번호 하나(APP_PASSWORD)로 보호
// 최초 접속 시 ?key=비밀번호 로 들어오면 해시를 쿠키에 저장하고, 이후 요청은 쿠키로 확인
const AUTH_COOKIE = 'nowkids_auth';
const KEY_PARAM = 'key';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180일

// APP_PASSWORD 환경변수를 설정하기 전까지만 쓰는 임시 비밀번호의 SHA-256 해시 (평문은 저장소에 두지 않음)
// APP_PASSWORD를 설정하면 이 임시 비밀번호와 그걸로 발급된 쿠키는 더 이상 통하지 않음
const TEMP_PASSWORD_HASH = 'c167f5386fc80de8286cffdb7ba8bc3d8b54fba104f2b6538457f61f43d12106';

async function sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function unauthorized(req: NextRequest, message: string) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: message }, { status: 401 });
    }
    return new NextResponse(
        `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>접근 제한</title></head>` +
            `<body style="font-family:sans-serif;padding:48px 16px;text-align:center"><h1>접근 권한이 없습니다</h1><p>${message}</p></body></html>`,
        { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}

export async function middleware(req: NextRequest) {
    const password = process.env.APP_PASSWORD;
    const expected = password ? await sha256(password) : TEMP_PASSWORD_HASH;
    const key = req.nextUrl.searchParams.get(KEY_PARAM);

    if (key !== null) {
        if ((await sha256(key)) !== expected) {
            return unauthorized(req, '비밀번호가 올바르지 않습니다.');
        }
        // 주소창/기록에 비밀번호가 남지 않도록 key를 제거한 주소로 이동
        const cleanUrl = req.nextUrl.clone();
        cleanUrl.searchParams.delete(KEY_PARAM);
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.set(AUTH_COOKIE, expected, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });
        return res;
    }

    if (req.cookies.get(AUTH_COOKIE)?.value === expected) {
        return NextResponse.next();
    }

    return unauthorized(req, '공유받은 접속 주소(비밀번호 포함)로 다시 접속해 주세요.');
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
