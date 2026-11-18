'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import PasswordDialog from '@/components/molecules/PasswordDialog';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { DepartmentDetail, DepartmentOverview } from '@/types';

// 부서 관리 — 개편(통합·분리·폐지·이름 변경)을 교역자가 직접 반영
// 진급: 예배 시간과 상관없이, 나이가 "끝 나이"를 넘은 학생은 "다음 부서"로 올라감

interface Draft {
    id: string | null;
    name: string;
    divisionId: string;
    kind: 'school' | 'report_only';
    serviceTime: string;
    ageMin: string;
    ageMax: string;
    sortOrder: string;
    nextDepartmentId: string;
    ch2chOrgName: string;
    archived: boolean;
    classes: { id?: string; name: string }[];
}

function toDraft(d: DepartmentDetail): Draft {
    return {
        id: d.id,
        name: d.name,
        divisionId: d.divisionId,
        kind: d.kind,
        serviceTime: d.serviceTime ?? '',
        ageMin: d.ageMin?.toString() ?? '',
        ageMax: d.ageMax?.toString() ?? '',
        sortOrder: d.sortOrder.toString(),
        nextDepartmentId: d.nextDepartmentId ?? '',
        ch2chOrgName: d.ch2chOrgName ?? '',
        archived: d.archived,
        classes: d.classes.map((c) => ({ ...c })),
    };
}

function ageText(d: DepartmentDetail): string {
    if (d.ageMin === null && d.ageMax === null) return '-';
    return `${d.ageMin ?? ''}~${d.ageMax ?? ''}세`;
}

async function call(url: string, method: string, password: string, body: unknown) {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': encodeURIComponent(password) },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `요청 실패 (${res.status})`);
    return data;
}

export default function DepartmentManagerSection({ onChanged }: { onChanged?: () => void }) {
    const { withPassword, dialogProps } = useAdminPassword();
    const [data, setData] = useState<DepartmentOverview | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [original, setOriginal] = useState<DepartmentDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(() => {
        fetch('/api/departments?detail=1')
            .then((r) => r.json())
            .then(setData)
            .catch(() => setError('부서 목록을 불러오지 못했습니다.'));
    }, []);
    useEffect(() => {
        load();
    }, [load]);

    const byId = useMemo(() => new Map((data?.departments ?? []).map((d) => [d.id, d])), [data]);
    const visible = (data?.departments ?? []).filter((d) => showArchived || !d.archived);

    const openNew = () => {
        setOriginal(null);
        setDialogError(null);
        setDraft({
            id: null,
            name: '',
            divisionId: data?.divisions[0]?.id ?? '',
            kind: 'school',
            serviceTime: '',
            ageMin: '',
            ageMax: '',
            sortOrder: '100',
            nextDepartmentId: '',
            ch2chOrgName: '',
            archived: false,
            classes: [],
        });
    };
    const openEdit = (d: DepartmentDetail) => {
        setOriginal(d);
        setDialogError(null);
        setDraft(toDraft(d));
    };

    const save = () => {
        if (!draft) return;
        const d = draft;
        setDialogError(null);
        const fields = {
            name: d.name,
            divisionId: d.divisionId,
            kind: d.kind,
            serviceTime: d.serviceTime,
            ageMin: d.ageMin,
            ageMax: d.ageMax,
            sortOrder: d.sortOrder,
            nextDepartmentId: d.nextDepartmentId,
            ch2chOrgName: d.ch2chOrgName,
            ...(original && original.archived !== d.archived ? { archived: d.archived } : {}),
        };
        const classesChanged =
            JSON.stringify(d.classes.map((c) => [c.id ?? null, c.name.trim()])) !==
            JSON.stringify((original?.classes ?? []).map((c) => [c.id, c.name]));
        setSaving(true);
        withPassword(
            async (password) => {
                try {
                    let id = d.id;
                    if (id) {
                        await call(`/api/admin/departments/${id}`, 'PATCH', password, fields);
                    } else {
                        id = (await call('/api/admin/departments', 'POST', password, fields)).id as string;
                    }
                    if (classesChanged && d.kind === 'school' && !d.archived) {
                        await call(
                            `/api/admin/departments/${id}/classes`,
                            'PUT',
                            password,
                            d.classes.filter((c) => c.name.trim()).map((c) => ({ id: c.id, name: c.name.trim() }))
                        );
                    }
                    setNotice(`${d.name} 저장했습니다.`);
                    setDraft(null);
                    load();
                    onChanged?.();
                } finally {
                    setSaving(false);
                }
            },
            (err) => {
                setSaving(false);
                setDialogError(err.message);
            }
        );
    };

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((p) => (p ? { ...p, [key]: value } : p));
    const nextOptions = (data?.departments ?? []).filter(
        (d) => !d.archived && d.id !== draft?.id && d.kind === 'school'
    );

    return (
        <Paper sx={{ p: 3 }}>
            <PasswordDialog {...dialogProps} title="관리자 비밀번호" message="부서 정보를 저장합니다." />
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1}>
                <TypographyAtom variant="h6" fontWeight="bold">
                    부서 관리
                </TypographyAtom>
                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                        control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
                        label="폐지한 부서도 보기"
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} disabled={!data}>
                        부서 추가
                    </Button>
                </Stack>
            </Stack>
            <TypographyAtom variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                부서 이름·예배 시간·대상 나이·반을 고치고, 개편으로 없어지는 부서는 폐지합니다. 진급할 때는 예배 시간과
                상관없이 나이가 <b>끝 나이</b>를 넘은 학생이 <b>다음 부서</b>로 올라갑니다. 폐지한 부서는 지우지 않고 숨기므로
                지난 출석 기록은 그대로 남습니다.
            </TypographyAtom>
            {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
            {notice && <Alert severity="success" sx={{ mt: 1 }} onClose={() => setNotice(null)}>{notice}</Alert>}

            <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>교육부</TableCell>
                            <TableCell>부서</TableCell>
                            <TableCell>예배</TableCell>
                            <TableCell>대상 나이</TableCell>
                            <TableCell>다음 부서</TableCell>
                            <TableCell align="right">재적</TableCell>
                            <TableCell align="right">반</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visible.map((d) => (
                            <TableRow key={d.id} sx={d.archived ? { opacity: 0.5 } : undefined}>
                                <TableCell>{d.division}</TableCell>
                                <TableCell>
                                    {d.name}
                                    {d.kind === 'report_only' && <Chip size="small" label="보고만" sx={{ ml: 1 }} />}
                                    {d.archived && <Chip size="small" label="폐지" sx={{ ml: 1 }} />}
                                </TableCell>
                                <TableCell>{d.serviceTime ?? '-'}</TableCell>
                                <TableCell>{ageText(d)}</TableCell>
                                <TableCell>{d.nextDepartmentId ? byId.get(d.nextDepartmentId)?.name ?? '?' : '-'}</TableCell>
                                <TableCell align="right">{d.kind === 'school' ? `${d.activeStudents}명` : '-'}</TableCell>
                                <TableCell align="right">{d.kind === 'school' ? d.classes.length : '-'}</TableCell>
                                <TableCell align="right">
                                    <Button size="small" onClick={() => openEdit(d)}>
                                        고치기
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={draft !== null} onClose={() => !saving && setDraft(null)} fullWidth maxWidth="sm">
                <DialogTitle>{draft?.id ? `${original?.name} 고치기` : '부서 추가'}</DialogTitle>
                {draft && (
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {dialogError && <Alert severity="error">{dialogError}</Alert>}
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    select
                                    label="교육부"
                                    value={draft.divisionId}
                                    onChange={(e) => set('divisionId', e.target.value)}
                                    sx={{ minWidth: 120 }}
                                >
                                    {data?.divisions.map((v) => (
                                        <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    label="부서 이름"
                                    value={draft.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    fullWidth
                                    placeholder="예: 미취학1부"
                                />
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    select
                                    label="종류"
                                    value={draft.kind}
                                    onChange={(e) => set('kind', e.target.value as Draft['kind'])}
                                    sx={{ minWidth: 160 }}
                                >
                                    <MenuItem value="school">학생 출석 부서</MenuItem>
                                    <MenuItem value="report_only">주일보고만</MenuItem>
                                </TextField>
                                <TextField
                                    label="예배 시간"
                                    value={draft.serviceTime}
                                    onChange={(e) => set('serviceTime', e.target.value)}
                                    placeholder="예: 10시"
                                    fullWidth
                                />
                                <TextField
                                    label="표시 순서"
                                    type="number"
                                    value={draft.sortOrder}
                                    onChange={(e) => set('sortOrder', e.target.value)}
                                    sx={{ width: 110 }}
                                />
                            </Stack>
                            {draft.kind === 'school' && (
                                <>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TextField
                                            label="시작 나이"
                                            type="number"
                                            value={draft.ageMin}
                                            onChange={(e) => set('ageMin', e.target.value)}
                                            sx={{ width: 110 }}
                                        />
                                        <span>~</span>
                                        <TextField
                                            label="끝 나이"
                                            type="number"
                                            value={draft.ageMax}
                                            onChange={(e) => set('ageMax', e.target.value)}
                                            sx={{ width: 110 }}
                                        />
                                        <TypographyAtom variant="caption" color="text.secondary">
                                            주일보고서와 같은 세는 나이
                                        </TypographyAtom>
                                    </Stack>
                                    <TextField
                                        select
                                        label="다음 부서 (끝 나이를 넘으면 진급)"
                                        value={draft.nextDepartmentId}
                                        onChange={(e) => set('nextDepartmentId', e.target.value)}
                                        helperText="예배 시간과 상관없이 고를 수 있습니다. 마지막 부서면 비워 두세요."
                                    >
                                        <MenuItem value="">없음</MenuItem>
                                        {nextOptions.map((o) => (
                                            <MenuItem key={o.id} value={o.id}>
                                                {o.name}
                                                {o.serviceTime ? ` (${o.serviceTime})` : ''} {ageText(o)}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        label="ch2ch 기관명 (북마클릿 연동)"
                                        value={draft.ch2chOrgName}
                                        onChange={(e) => set('ch2chOrgName', e.target.value)}
                                        placeholder="예: [덕소]소년부"
                                        helperText="ch2ch 교육기관 이름과 똑같이 적어야 출석 반영 북마클릿이 이 부서를 찾습니다."
                                    />
                                    <Divider />
                                    <TypographyAtom variant="subtitle2">반 (출석 화면에서 묶어 보기용)</TypographyAtom>
                                    {draft.classes.map((c, i) => (
                                        <Stack key={c.id ?? `new-${i}`} direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                size="small"
                                                value={c.name}
                                                onChange={(e) =>
                                                    set('classes', draft.classes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                                                }
                                                fullWidth
                                            />
                                            <IconButton
                                                size="small"
                                                aria-label="위로"
                                                disabled={i === 0}
                                                onClick={() => {
                                                    const next = [...draft.classes];
                                                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                                    set('classes', next);
                                                }}
                                            >
                                                <ArrowUpwardIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                aria-label="반 삭제"
                                                onClick={() => set('classes', draft.classes.filter((_, j) => j !== i))}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => set('classes', [...draft.classes, { name: `${draft.classes.length + 1}반` }])}
                                        sx={{ alignSelf: 'flex-start' }}
                                    >
                                        반 추가
                                    </Button>
                                    <TypographyAtom variant="caption" color="text.secondary">
                                        반을 지우면 그 반 학생은 &quot;반 미배정&quot;이 됩니다. 출석 기록은 그대로입니다.
                                    </TypographyAtom>
                                </>
                            )}
                            {draft.id && (
                                <>
                                    <Divider />
                                    <FormControlLabel
                                        control={<Switch checked={draft.archived} onChange={(e) => set('archived', e.target.checked)} />}
                                        label={
                                            draft.archived
                                                ? '폐지 (목록·출석 링크에서 숨김, 기록은 보존)'
                                                : '사용 중'
                                        }
                                    />
                                    {draft.archived && !original?.archived && (original?.activeStudents ?? 0) > 0 && (
                                        <Alert severity="warning">
                                            재적 학생 {original?.activeStudents}명이 있어 폐지할 수 없습니다. 학생을 먼저 다른 부서로
                                            옮겨 주세요.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Stack>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => setDraft(null)} disabled={saving}>
                        취소
                    </Button>
                    <Button variant="contained" onClick={save} disabled={saving || !draft?.name.trim()}>
                        저장
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
