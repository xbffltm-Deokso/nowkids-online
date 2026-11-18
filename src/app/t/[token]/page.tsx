import type { Metadata } from 'next';
import LinkAttendance from '@/components/organisms/LinkAttendance';

// 교사용 부서 출석 링크 — 로그인 없이 토큰으로 그 부서 출석만 입력
export const metadata: Metadata = {
    title: '출석 체크',
    referrer: 'no-referrer', // 링크 토큰이 다른 사이트로 새지 않게
    robots: { index: false, follow: false },
};

export default async function LinkPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <LinkAttendance token={token} />;
}
