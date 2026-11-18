import type { Metadata, Viewport } from 'next';
import ThemeRegistry from '@/theme/ThemeRegistry';

export const metadata: Metadata = {
    title: '덕소교회 교회학교 출석',
    description: '덕소교회 교회학교 부서별 출석 관리',
};

export const viewport: Viewport = {
    themeColor: '#F4F5F7',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <head>
                {/* 한글 본문용 Pretendard (가변 글꼴, 쓰는 글자만 받는 분할 버전) */}
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
                />
            </head>
            <body>
                <ThemeRegistry>{children}</ThemeRegistry>
            </body>
        </html>
    );
}
