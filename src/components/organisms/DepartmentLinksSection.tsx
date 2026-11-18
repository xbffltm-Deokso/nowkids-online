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

// 부서별 교사 출석 링크 — 지금 링크 복사, 새로 만들기·교체 (교체하면 이전 링크는 즉시 무효)
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

    const show = (department: string, path: string) => {
        setIssued({ department, url: `${window.location.origin}${path}` });
        setCopied(false);
    };

    // 지금 쓰는 링크를 받아 바로 클립보드에 복사
    // 다른 부서 링크가 화면에 남아 잘못 복사되지 않게, 누르는 순간 이전 링크를 지움
    const copyCurrent = (dep: DepartmentSummary) => {
        setError(null);
        setIssued(null);
        withPassword(
            async (password) => {
                const res = await fetch(`/api/admin/departments/${dep.id}/link`, {
                    headers: { 'X-Admin-Password': encodeURIComponent(password) },
                });
                const body = await res.json().catch(() => null);
                if (!res.ok) throw new Error(body?.error || `요청 실패 (${res.status})`);
                show(body.department, body.path);
                try {
                    await navigator.clipboard.writeText(`${window.location.origin}${body.path}`);
                    setCopied(true);
                } catch {
                    // 클립보드 권한이 없으면 아래 칸에서 직접 복사
                }
            },
            (err) => {
                setIssued(null);
                setError(`${dep.name} 링크 복사 실패: ${err.message}`);
            }
        );
    };

    const issue = (dep: DepartmentSummary) => {
        if (dep.hasLink && !confirm(`${dep.name}의 출석 링크를 새로 만들면 지금 링크는 바로 쓸 수 없게 됩니다. 계속할까요?`)) return;
        setError(null);
        setIssued(null);
        withPassword(
            async (password) => {
                const res = await fetch(`/api/admin/departments/${dep.id}/link`, {
                    method: 'POST',
                    headers: { 'X-Admin-Password': encodeURIComponent(password) },
                });
                const body = await res.json().catch(() => null);
                if (!res.ok) throw new Error(body?.error || `요청 실패 (${res.status})`);
                show(body.department, body.path);
                load();
            },
            (err) => {
                setIssued(null);
                setError(`${dep.name} 링크 만들기 실패: ${err.message}`);
            }
        );
    };

    return (
        <Paper sx={{ p: 3 }}>
            <PasswordDialog {...dialogProps} title="관리자 비밀번호" message="부서 출석 링크를 만들거나 교체합니다." />
            <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                부서 출석 링크
            </TypographyAtom>
            <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                선생님들은 로그인 없이 이 링크로 그 부서 출석만 입력합니다. 링크 복사로 지금 링크를 다시 받아 단톡방에 공유할
                수 있습니다. 링크가 밖으로 퍼졌다면 새 링크로 교체하세요. 이전 링크는 즉시 막힙니다.
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
                        {d.hasLink && d.linkCopyable && (
                            <Button size="small" variant="outlined" onClick={() => copyCurrent(d)}>
                                링크 복사
                            </Button>
                        )}
                        {d.hasLink && !d.linkCopyable && (
                            <Chip size="small" color="warning" variant="outlined" label="예전 링크 — 복사하려면 교체 필요" />
                        )}
                        <Button size="small" color={d.hasLink ? 'inherit' : 'primary'} onClick={() => issue(d)}>
                            {d.hasLink ? '새 링크로 교체' : '링크 만들기'}
                        </Button>
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
}
