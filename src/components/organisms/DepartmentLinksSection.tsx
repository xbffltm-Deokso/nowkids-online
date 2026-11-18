'use client';

import { useCallback, useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import PasswordDialog from '@/components/molecules/PasswordDialog';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { DepartmentSummary } from '@/types';

// 부서별 교사 출석 링크 만들기·교체 — 링크 원문은 저장되지 않아 만든 직후에만 보여 줄 수 있음
export default function DepartmentLinksSection() {
    const { withPassword, dialogProps } = useAdminPassword();
    const [list, setList] = useState<DepartmentSummary[]>([]);
    const [issued, setIssued] = useState<{ department: string; url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(() => {
        fetch('/api/departments')
            .then((r) => r.json())
            .then((rows: DepartmentSummary[]) => setList(rows.filter((d) => d.kind === 'school')))
            .catch(() => setError('부서 목록을 불러오지 못했습니다.'));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const issue = (dep: DepartmentSummary) => {
        if (dep.hasLink && !confirm(`${dep.name}의 출석 링크를 새로 만들면 지금 링크는 바로 쓸 수 없게 됩니다. 계속할까요?`)) return;
        setError(null);
        withPassword(
            async (password) => {
                const res = await fetch(`/api/admin/departments/${dep.id}/link`, {
                    method: 'POST',
                    headers: { 'X-Admin-Password': encodeURIComponent(password) },
                });
                const body = await res.json().catch(() => null);
                if (!res.ok) throw new Error(body?.error || `요청 실패 (${res.status})`);
                setIssued({ department: body.department, url: `${window.location.origin}${body.path}` });
                setCopied(false);
                load();
            },
            (err) => setError(`링크 만들기 실패: ${err.message}`)
        );
    };

    return (
        <Paper sx={{ p: 3 }}>
            <PasswordDialog {...dialogProps} title="관리자 비밀번호" message="부서 출석 링크를 만들거나 교체합니다." />
            <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                부서 출석 링크
            </TypographyAtom>
            <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                선생님들은 로그인 없이 이 링크로 그 부서 출석만 입력합니다. 링크는 만든 직후에만 볼 수 있으니 바로 단톡방에
                공유해 주세요. 링크가 밖으로 퍼지면 새로 만들면 이전 링크는 즉시 막힙니다.
            </TypographyAtom>
            {error && <Alert severity="error" sx={{ my: 1 }} onClose={() => setError(null)}>{error}</Alert>}
            {issued && (
                <Alert severity="success" sx={{ my: 2 }}>
                    <b>{issued.department}</b> 출석 링크
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField size="small" fullWidth value={issued.url} slotProps={{ input: { readOnly: true } }} />
                        <Button
                            variant="outlined"
                            onClick={async () => {
                                await navigator.clipboard.writeText(issued.url);
                                setCopied(true);
                            }}
                        >
                            {copied ? '복사됨' : '복사'}
                        </Button>
                    </Stack>
                </Alert>
            )}
            <Stack spacing={1} sx={{ mt: 1 }}>
                {list.map((d) => (
                    <Stack key={d.id} direction="row" alignItems="center" spacing={1}>
                        <TypographyAtom variant="body2" sx={{ minWidth: 110 }}>{d.name}</TypographyAtom>
                        {d.serviceTime && <Chip size="small" label={d.serviceTime} variant="outlined" />}
                        <Chip size="small" label={d.hasLink ? '링크 있음' : '링크 없음'} color={d.hasLink ? 'success' : 'default'} />
                        <Button size="small" onClick={() => issue(d)}>{d.hasLink ? '새 링크로 교체' : '링크 만들기'}</Button>
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
}
