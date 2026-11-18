'use client';

import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import PasswordDialog from '@/components/molecules/PasswordDialog';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { DepartmentDetail, DepartmentOverview } from '@/types';

interface Item {
    name: string;
    sub: string | null;
    note?: string;
}

interface SyncResult {
    department: string;
    orgWarning: string | null;
    totalRows: number;
    teachersSkipped: number;
    subs: { sub: string; count: number; grade: string | null }[];
    unknownSubs: string[];
    matched: number;
    looseMatches: Item[];
    moved: Item[];
    added: Item[];
    missing: Item[];
    ambiguous: Item[];
    duplicates: Item[];
    ageWarnings: Item[];
    applied: boolean;
}

function Names({ title, items, severity, hint }: { title: string; items: Item[]; severity: 'info' | 'warning' | 'success'; hint?: string }) {
    if (items.length === 0) return null;
    return (
        <Alert severity={severity} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <b>
                {title} {items.length}명
            </b>
            {hint && (
                <TypographyAtom variant="caption" component="div" color="text.secondary">
                    {hint}
                </TypographyAtom>
            )}
            <TypographyAtom variant="body2" sx={{ mt: 0.5 }}>
                {items.map((i) => `${i.name}${i.sub ? `(${i.sub})` : ''}${i.note ? ` ${i.note}` : ''}`).join(', ')}
            </TypographyAtom>
        </Alert>
    );
}

// 교적 명단 동기화 — 부서를 고르고 ch2ch 교육기관 명단(.xls)을 올려 그 부서 학생을 맞춤 (미리보기 → 반영)
export default function RosterSyncSection({ onApplied }: { onApplied?: () => void }) {
    const { withPassword, dialogProps } = useAdminPassword();
    const [departments, setDepartments] = useState<DepartmentDetail[]>([]);
    const [departmentId, setDepartmentId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [createGrades, setCreateGrades] = useState(true);
    const [result, setResult] = useState<SyncResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/departments?detail=1')
            .then((r) => r.json())
            .then((d: DepartmentOverview) => setDepartments(d.departments.filter((x) => x.kind === 'school' && !x.archived)))
            .catch(() => setError('부서 목록을 불러오지 못했습니다.'));
    }, []);

    // 파일 이름의 기관명([덕소]소년부)으로 부서를 미리 골라 줌
    const pickFile = (f: File | null) => {
        setFile(f);
        setResult(null);
        if (!f) return;
        const hit = departments.find((d) => d.ch2chOrgName && f.name.includes(d.ch2chOrgName));
        if (hit) setDepartmentId(hit.id);
    };

    const run = (apply: boolean) => {
        if (!file || !departmentId) return;
        setError(null);
        setBusy(true);
        withPassword(
            async (password) => {
                try {
                    const form = new FormData();
                    form.append('file', file);
                    form.append('departmentId', departmentId);
                    form.append('apply', apply ? '1' : '0');
                    form.append('createGrades', createGrades ? '1' : '0');
                    const res = await fetch('/api/admin/roster-sync', {
                        method: 'POST',
                        headers: { 'X-Admin-Password': encodeURIComponent(password) },
                        body: form,
                    });
                    const body = await res.json().catch(() => null);
                    if (!res.ok) throw new Error(body?.error || `요청 실패 (${res.status})`);
                    setResult(body);
                    if (apply) onApplied?.();
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

    const selected = departments.find((d) => d.id === departmentId);

    return (
        <Paper sx={{ p: 3 }}>
            <PasswordDialog {...dialogProps} title="관리자 비밀번호" message="교적 명단으로 학생 정보를 맞춥니다." />
            <TypographyAtom variant="h6" gutterBottom>
                교적 명단 동기화 (ch2ch)
            </TypographyAtom>
            <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                ch2ch → 교육기관 검색 → 부서 → 명단 내려받기로 받은 <b>.xls</b> 파일을 그대로 올려 주세요. 먼저 바뀔 내용을 보여
                드리고, 확인 후 반영합니다. 명단에 없는 학생은 지우지 않고 &quot;교적 등록 필요&quot;로 표시합니다. 같은 나이라도
                부서는 명단 기준으로 정해지며, 대상 나이를 벗어난 학생은 따로 알려 드립니다.
            </TypographyAtom>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }} alignItems={{ sm: 'center' }}>
                <TextField
                    select
                    size="small"
                    label="부서"
                    value={departmentId}
                    onChange={(e) => {
                        setDepartmentId(e.target.value);
                        setResult(null);
                    }}
                    sx={{ minWidth: 180 }}
                >
                    {departments.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                            {d.name}
                            {d.serviceTime ? ` (${d.serviceTime})` : ''}
                        </MenuItem>
                    ))}
                </TextField>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                    {file ? file.name : '명단 파일 선택'}
                    <input
                        hidden
                        type="file"
                        accept=".xls,application/vnd.ms-excel,.html,.htm"
                        onChange={(e) => {
                            pickFile(e.target.files?.[0] ?? null);
                            e.target.value = '';
                        }}
                    />
                </Button>
                <Button
                    variant="contained"
                    disabled={!file || !departmentId || busy}
                    onClick={() => run(false)}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    미리보기
                </Button>
            </Stack>
            {selected && !selected.ch2chOrgName && (
                <TypographyAtom variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                    {selected.name}에 ch2ch 기관명이 없습니다. 부서 관리에서 넣어 두면 파일 이름으로 부서를 자동으로 고르고 잘못
                    고른 경우를 알려 드립니다.
                </TypographyAtom>
            )}

            {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {result && (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Divider />
                    {result.applied ? (
                        <Alert severity="success">
                            <b>{result.department}</b>에 반영했습니다. 갱신 {result.matched}명 · 추가 {result.added.length}명 · 교적 등록
                            필요 표시 {result.missing.length}명
                        </Alert>
                    ) : (
                        <TypographyAtom variant="subtitle1">
                            {result.department} 미리보기 — 명단 학생 {result.totalRows}명 (선생님 {result.teachersSkipped}줄 제외)
                        </TypographyAtom>
                    )}
                    {result.orgWarning && <Alert severity="error">{result.orgWarning} 부서를 다시 확인해 주세요.</Alert>}

                    {result.subs.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                            <TypographyAtom variant="body2" color="text.secondary">
                                명단의 학년:
                            </TypographyAtom>
                            {result.subs.map((s) => (
                                <Chip
                                    key={s.sub}
                                    size="small"
                                    variant="outlined"
                                    color={s.grade ? 'default' : 'warning'}
                                    label={`${s.sub} ${s.count}명 → ${s.grade ?? (result.unknownSubs.includes(s.sub) ? '학년 없음' : '학년 구분 안 함')}`}
                                />
                            ))}
                        </Stack>
                    )}
                    {!result.applied && result.unknownSubs.length > 0 && (
                        <FormControlLabel
                            control={<Checkbox checked={createGrades} onChange={(e) => setCreateGrades(e.target.checked)} />}
                            label={`없는 학년(${result.unknownSubs.join(', ')})을 이 부서 학년으로 만들고 학생을 넣기`}
                        />
                    )}

                    <Names title="새로 추가" items={result.added} severity="info" hint="앱에 없는 학생 — 이 부서 학생으로 만들고 반은 미배정" />
                    <Names title="다른 부서에서 옮겨 옴" items={result.moved} severity="warning" hint="이 부서로 옮기고 반은 미배정 (괄호 뒤는 지금 학년)" />
                    <Names title="교적 등록 필요" items={result.missing} severity="warning" hint="앱의 이 부서에는 있는데 명단에 없음 — 지우지 않고 표시만" />
                    <Names title="이름 표기가 달라 연결" items={result.looseMatches} severity="info" hint="명단 이름 → 앱 이름" />
                    <Names title="대상 나이를 벗어남" items={result.ageWarnings} severity="warning" hint="세는 나이 기준 — 부서를 다시 확인해 주세요" />
                    <Names title="누군지 확실하지 않아 건너뜀" items={result.ambiguous} severity="warning" hint="같은 이름이 여럿 — 학생 관리에서 직접 확인" />
                    <Names title="명단에 두 번 나와 건너뜀" items={result.duplicates} severity="warning" />
                    {result.matched > 0 && (
                        <TypographyAtom variant="body2" color="text.secondary">
                            기존 학생 {result.matched}명은 개인정보·학년을 명단 기준으로 갱신합니다.
                        </TypographyAtom>
                    )}

                    {!result.applied && (
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={() => run(true)} disabled={busy || !!result.orgWarning}>
                                이대로 반영
                            </Button>
                            <Button onClick={() => setResult(null)} disabled={busy}>
                                취소
                            </Button>
                        </Stack>
                    )}
                </Stack>
            )}
        </Paper>
    );
}
