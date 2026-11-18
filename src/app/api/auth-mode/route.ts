import { NextResponse } from 'next/server';
import { adminPasswordDisabled } from '@/lib/admin-auth';

// GET /api/auth-mode — 관리자 비밀번호를 물어야 하는지 (미리보기에서 임시로 끈 경우 false)
export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json({ passwordRequired: !adminPasswordDisabled() });
}
