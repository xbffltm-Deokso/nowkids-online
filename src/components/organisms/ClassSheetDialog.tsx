'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import PasswordDialog from '@/components/molecules/PasswordDialog';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { DepartmentDetail } from '@/types';

interface SheetResult {
    department: string;
    changes: { name: string; from: string; to: string }[];
    newClasses: string[];
    unchanged: number;
    unmatched: string[];
    ambiguous: string[];
    applied: boolean;
}

// 반 편성 시트 — 부서 학생 목록을 엑셀로 받아 "새 반"을 채워 올리면 한 번에 반 배정
export default function ClassSheetDialog({
    open,
    department,
    onClose,
    onApplied,
}: {
    open: boolean;
    department: DepartmentDetail;
    onClose: () => void;
    onApplied: () => void;
}) {
    const { withPassword, dialogProps } = useAdminPassword();
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<SheetResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const url = `/api/admin/departments/${department.id}/class-sheet`;

    const download = () => {
        setError(null);
        withPassword(
            async (password) => {
                const res = await fetch(url, { headers: { 'X-Admin-Password': encodeURIComponent(password) } });
                if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    throw new Error(body?.error || `요청 실패 (${res.status})`);
                }
                const link = document.createElement('a');
                link.href = URL.createObjectURL(await res.blob());
                link.download = `반편성_${department.name}.xlsx`;
                link.click();
                URL.revokeObjectURL(link.href);
            },
            (err) => setError(`시트 받기 실패: ${err.message}`)
        );
    };

    const upload = (apply: boolean) => {
        if (!file) return;
        setError(null);
        setBusy(true);
        withPassword(
            async (password) => {
                try {
                    const form = new FormData();
                    form.append('file', file);
                    form.append('apply', apply ? '1' : '0');
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'X-Admin-Password': encodeURIComponent(password) },
                        body: form,
                    });
                    const body = await res.json().catch(() => null);
                    if (!res.ok) throw new Error(body?.error || `요청 실패 (${res.status})`);
                    setResult(body);
                    if (apply) onApplied();
                } finally {
                    setBusy(false);
                }
            },
            (err) => {
                setBusy(false);
                setError(err.message);
            }
        );
    };

    const close = () => {
        setFile(null);
        setResult(null);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
            <PasswordDialog {...dialogProps} title="관리자 비밀번호" message="반 편성 시트를 받거나 반영합니다." />
            <DialogTitle>{department.name} 반 편성</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <TypographyAtom variant="body2" color="text.secondary">
                        1. 시트를 받아 엑셀이나 구글 시트에서 <b>새 반</b> 칸에 1반, 2반처럼 적습니다. 비워 두면 지금 반 그대로,
                        &quot;미배정&quot;이라고 적으면 반에서 뺍니다.
                        {department.grades.length > 0 && ' 학년별로 반이 따로 만들어집니다.'}
                        <br />
                        2. 저장한 파일(.xlsx)을 올려 미리보기를 확인하고 반영합니다. 없는 반은 새로 만듭니다.
                    </TypographyAtom>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download}>
                            반 편성 시트 받기
                        </Button>
                        <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                            {file ? file.name : '채운 시트 선택'}
                            <input
                                hidden
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={(e) => {
                                    setFile(e.target.files?.[0] ?? null);
                                    setResult(null);
                                    e.target.value = '';
                                }}
                            />
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!file || busy}
                            onClick={() => upload(false)}
                            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                        >
                            미리보기
                        </Button>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    {result && (
                        <Stack spacing={1.5}>
                            {result.applied ? (
                                <Alert severity="success">{result.changes.length}명의 반을 바꿨습니다.</Alert>
                            ) : (
                                <TypographyAtom variant="subtitle2">
                                    바뀌는 학생 {result.changes.length}명 · 그대로 {result.unchanged}명
                                </TypographyAtom>
                            )}
                            {result.newClasses.length > 0 && (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                                    <TypographyAtom variant="body2" color="text.secondary">
                                        새로 만드는 반:
                                    </TypographyAtom>
                                    {result.newClasses.map((c) => (
                                        <Chip key={c} size="small" label={c} color="info" variant="outlined" />
                                    ))}
                                </Stack>
                            )}
                            {result.unmatched.length > 0 && (
                                <Alert severity="warning">이 부서에 없는 이름 (건너뜀): {result.unmatched.join(', ')}</Alert>
                            )}
                            {result.ambiguous.length > 0 && (
                                <Alert severity="warning">
                                    같은 이름이 여럿이라 건너뜀 (ID 칸을 지우지 마세요): {result.ambiguous.join(', ')}
                                </Alert>
                            )}
                            {result.changes.length > 0 && (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>이름</TableCell>
                                            <TableCell>지금 반</TableCell>
                                            <TableCell>새 반</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {result.changes.map((c) => (
                                            <TableRow key={c.name + c.to}>
                                                <TableCell>{c.name}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{c.from}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{c.to}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={close}>닫기</Button>
                {result && !result.applied && result.changes.length > 0 && (
                    <Button variant="contained" onClick={() => upload(true)} disabled={busy}>
                        이대로 반영
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
