'use client';

import { useEffect, useRef, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import ButtonAtom from '@/components/atoms/ButtonAtom';

// ch2ch 출석부(분기) 화면에서 public/ch2ch-sync.js를 불러오는 북마클릿 안내
function buildBookmarklet(origin: string): string {
    return (
        "javascript:(function(){var s=document.createElement('script');" +
        `s.src='${origin}/ch2ch-sync.js?v='+Date.now();` +
        'document.body.appendChild(s);})();'
    );
}

export default function Ch2chSyncPanel() {
    const linkRef = useRef<HTMLAnchorElement>(null);
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const bookmarklet = buildBookmarklet(window.location.origin);
        setCode(bookmarklet);
        // React는 javascript: href를 막으므로 마운트 후 직접 지정
        linkRef.current?.setAttribute('href', bookmarklet);
    }, []);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
    };

    return (
        <Stack spacing={3}>
            <Paper sx={{ p: 3 }}>
                <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                    1. 북마클릿 등록 (처음 한 번만)
                </TypographyAtom>
                <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                    Chrome에서 Ctrl+Shift+B로 북마크바를 켠 뒤, 아래 파란 버튼을 북마크바로 끌어다 놓으세요.
                </TypographyAtom>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                    <Button
                        component="a"
                        ref={linkRef}
                        variant="contained"
                        onClick={(e) => e.preventDefault()}
                        sx={{ cursor: 'grab' }}
                    >
                        NowKids 출석 반영
                    </Button>
                    <ButtonAtom
                        label={copied ? '복사됨' : '코드 복사'}
                        variant="outlined"
                        size="small"
                        onClick={handleCopy}
                        disabled={!code}
                    />
                </Stack>
                <TypographyAtom variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                    끌어다 놓기가 안 되면: 북마크바에서 우클릭 → 페이지 추가 → 이름은 &quot;NowKids 출석 반영&quot;,
                    URL에는 &quot;코드 복사&quot;로 복사한 내용을 붙여넣기
                </TypographyAtom>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                    2. 분기마다 반영하기
                </TypographyAtom>
                <TypographyAtom variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                    <li>ch2ch에 로그인 → 교인관리 → 교육기관 검색 → 학년(예: 4학년) 선택 → 출석부(분기)</li>
                    <li>북마크바의 &quot;NowKids 출석 반영&quot; 클릭</li>
                    <li>오른쪽 위 안내창과 색칠된 칸(초록: 출석으로 체크, 빨강: 결석으로 해제)을 확인</li>
                    <li>ch2ch의 저장 버튼 클릭 → 다음 학년으로 이동해 반복</li>
                </TypographyAtom>
            </Paper>

            <Alert severity="info">
                학년 숫자로 연결됩니다(4.믿음 → 4학년, 5.소망 → 5학년, 6.사랑 → 6학년). 학생은 이름으로 맞추며,
                NowKids에 기록이 없는 주는 ch2ch 상태를 그대로 둡니다. 저장은 자동으로 하지 않습니다.
            </Alert>
        </Stack>
    );
}
