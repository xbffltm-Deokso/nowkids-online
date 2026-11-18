'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MenuItem from '@mui/material/MenuItem';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import { LinkRoster } from '@/types';

// 교사용 부서 출석 화면 (로그인 없이 부서 출석 링크로 접속)
// 바꾼 학생만 저장하고, 화면의 반에서 기록이 없는 학생은 결석으로 채움(다른 선생님이 먼저 저장했으면 그대로 둠)
const UNASSIGNED = '__unassigned__';
const REASONS = ['여행', '가족모임', '아픔', '기타'];

type Mark = { status: boolean; reason: string | null };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        const err = new Error(body?.error || `요청 실패 (${res.status})`) as Error & { status?: number };
        err.status = res.status;
        throw err;
    }
    return body as T;
}

function lastClassKey(token: string) {
    return `nowkids-link-class-${token.slice(0, 8)}`;
}

export default function LinkAttendance({ token }: { token: string }) {
    const [roster, setRoster] = useState<LinkRoster | null>(null);
    const [date, setDate] = useState<string | null>(null);
    const [classKey, setClassKey] = useState<string | null>(null);
    const [marks, setMarks] = useState<Record<string, Mark>>({}); // 화면에서 바꾼 값 (studentId → 표시)
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [friendOpen, setFriendOpen] = useState(false);

    const load = useCallback(async (d: string | null) => {
        setLoading(true);
        try {
            const data = await api<LinkRoster>(`/api/link/${token}${d ? `?date=${d}` : ''}`);
            setRoster(data);
            setDate(data.date);
            setMarks({});
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load(null);
    }, [load]);

    // 학생이 속한 탭: 반이 있으면 그 반, 없으면 "미배정" — 학년이 있는 부서는 학년별 미배정 (4.믿음 미배정)
    const tabKeyOf = useCallback(
        (s: { gradeId: string | null; classId: string | null }) =>
            s.classId ?? ((roster?.grades.length ?? 0) > 0 ? `${UNASSIGNED}:${s.gradeId ?? ''}` : UNASSIGNED),
        [roster]
    );

    // 반 목록: 설정된 반 + 반이 없는 학생이 있으면 (학년별) "미배정"
    const classTabs = useMemo(() => {
        if (!roster) return [];
        const tabs = roster.classes.map((c) => ({ key: c.id, name: c.name }));
        const unassigned = new Set(roster.students.filter((s) => !s.classId).map((s) => tabKeyOf(s)));
        if (roster.grades.length === 0) {
            if (unassigned.size > 0) tabs.push({ key: UNASSIGNED, name: '미배정' });
        } else {
            for (const g of [...roster.grades, { id: '', name: '학년 없음' }]) {
                const key = `${UNASSIGNED}:${g.id}`;
                if (unassigned.has(key)) tabs.push({ key, name: `${g.name} 미배정` });
            }
        }
        return tabs;
    }, [roster, tabKeyOf]);

    useEffect(() => {
        if (classTabs.length === 0 || classKey) return;
        let saved: string | null = null;
        try {
            saved = localStorage.getItem(lastClassKey(token));
        } catch {
            saved = null;
        }
        setClassKey(classTabs.some((t) => t.key === saved) ? saved : classTabs[0].key);
    }, [classTabs, classKey, token]);

    const selectClass = (key: string) => {
        setClassKey(key);
        try {
            localStorage.setItem(lastClassKey(token), key);
        } catch {
            // 저장 안 되는 브라우저는 무시
        }
    };

    const stored = roster?.attendance ?? {};
    const current = (id: string): Mark | null => marks[id] ?? stored[id] ?? null;
    const visible = (roster?.students ?? []).filter((s) => tabKeyOf(s) === classKey);
    const changedIds = Object.keys(marks).filter((id) => {
        const m = marks[id];
        const s = stored[id];
        return !s || s.status !== m.status || (s.reason ?? null) !== (m.reason ?? null);
    });

    const setMark = (id: string, mark: Mark) => setMarks((prev) => ({ ...prev, [id]: mark }));

    const changeDate = (d: string) => {
        if (changedIds.length > 0 && !confirm('저장하지 않은 변경이 있습니다. 날짜를 바꾸면 사라집니다. 바꿀까요?')) return;
        load(d);
    };

    const save = async () => {
        if (!roster || !date) return;
        setSaving(true);
        setMessage(null);
        try {
            // 바꾼 학생이 있는 반 + 지금 보고 있는 반에서 기록이 없는 학생은 결석으로 채움
            const touchedClasses = new Set<string>([classKey ?? '']);
            for (const id of changedIds) {
                const st = roster.students.find((s) => s.id === id);
                if (st) touchedClasses.add(tabKeyOf(st));
            }
            const fillAbsent = roster.students
                .filter((s) => touchedClasses.has(tabKeyOf(s)) && !stored[s.id] && !changedIds.includes(s.id))
                .map((s) => s.id);
            const result = await api<{ saved: number; filled: number }>(`/api/link/${token}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    changes: changedIds.map((id) => ({ studentId: id, status: marks[id].status, reason: marks[id].reason })),
                    fillAbsent,
                }),
            });
            setMessage({ type: 'success', text: `저장했습니다 (변경 ${result.saved}명, 결석으로 채움 ${result.filled}명)` });
            await load(date);
        } catch (err) {
            setMessage({ type: 'error', text: `저장 실패: ${(err as Error).message}` });
        } finally {
            setSaving(false);
        }
    };

    if (loading && !roster) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }
    if (!roster) {
        return <Alert severity="error" sx={{ m: 2 }}>{message?.text ?? '출석부를 불러오지 못했습니다.'}</Alert>;
    }

    const presentCount = visible.filter((s) => current(s.id)?.status).length;

    return (
        <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, pt: 2, pb: 12 }}>
            <TypographyAtom variant="h5" fontWeight="bold">{roster.department.name} 출석</TypographyAtom>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, mb: 2 }}>
                <TextField
                    type="date"
                    size="small"
                    value={date ?? ''}
                    onChange={(e) => e.target.value && changeDate(e.target.value)}
                />
                {date !== roster.defaultDate && (
                    <Button size="small" onClick={() => changeDate(roster.defaultDate)}>이번 주일로</Button>
                )}
            </Stack>

            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
                {classTabs.map((t) => (
                    <Chip
                        key={t.key}
                        label={t.name}
                        color={t.key === classKey ? 'primary' : 'default'}
                        onClick={() => selectClass(t.key)}
                    />
                ))}
            </Box>

            {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

            <TypographyAtom variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                출석 {presentCount} / {visible.length}명
            </TypographyAtom>

            <Stack spacing={1}>
                {visible.map((s) => {
                    const mark = current(s.id);
                    const present = mark?.status === true;
                    const changed = changedIds.includes(s.id);
                    return (
                        <Paper key={s.id} variant="outlined" sx={{ p: 1.5, borderColor: changed ? 'warning.main' : undefined }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TypographyAtom variant="body1" fontWeight="bold" noWrap>{s.name}</TypographyAtom>
                                    {s.status === '새친구' && <Chip label="새친구" size="small" color="info" sx={{ mt: 0.5 }} />}
                                </Box>
                                <ToggleButtonGroup
                                    exclusive
                                    size="medium"
                                    value={mark ? (present ? 'in' : 'out') : null}
                                    onChange={(_, v) => v && setMark(s.id, { status: v === 'in', reason: v === 'in' ? null : mark?.reason ?? null })}
                                >
                                    <ToggleButton value="in" color="success" sx={{ px: 2 }}>출석</ToggleButton>
                                    <ToggleButton value="out" color="error" sx={{ px: 2 }}>결석</ToggleButton>
                                </ToggleButtonGroup>
                            </Stack>
                            {mark && !mark.status && (
                                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                                    {REASONS.map((r) => (
                                        <Chip
                                            key={r}
                                            size="small"
                                            label={r}
                                            variant={mark.reason === r ? 'filled' : 'outlined'}
                                            onClick={() => setMark(s.id, { status: false, reason: mark.reason === r ? null : r })}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    );
                })}
                {visible.length === 0 && (
                    <TypographyAtom variant="body2" color="text.secondary">이 반에 학생이 없습니다.</TypographyAtom>
                )}
            </Stack>

            <Button startIcon={<PersonAddIcon />} sx={{ mt: 2 }} onClick={() => setFriendOpen(true)}>
                새 친구 등록
            </Button>

            <Paper elevation={6} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, p: 1.5 }}>
                <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                    <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        disabled={saving}
                        onClick={save}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
                    >
                        {changedIds.length > 0 ? `저장 (${changedIds.length}명 변경)` : '저장'}
                    </Button>
                </Box>
            </Paper>

            <NewFriendDialog
                open={friendOpen}
                token={token}
                date={date ?? roster.defaultDate}
                classes={roster.classes}
                defaultClassId={classKey && !classKey.startsWith(UNASSIGNED) ? classKey : ''}
                defaultGradeId={classKey?.startsWith(`${UNASSIGNED}:`) ? classKey.slice(UNASSIGNED.length + 1) : ''}
                onClose={() => setFriendOpen(false)}
                onCreated={(name) => {
                    setFriendOpen(false);
                    setMessage({ type: 'success', text: `${name} 친구를 등록하고 출석으로 기록했습니다.` });
                    load(date);
                }}
            />
        </Box>
    );
}

function NewFriendDialog({
    open, token, date, classes, defaultClassId, defaultGradeId, onClose, onCreated,
}: {
    open: boolean;
    token: string;
    date: string;
    classes: { id: string; name: string }[];
    defaultClassId: string;
    defaultGradeId: string; // 학년별 미배정 탭에서 등록하면 그 학년으로
    onClose: () => void;
    onCreated: (name: string) => void;
}) {
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<'M' | 'F' | null>(null);
    const [classId, setClassId] = useState(defaultClassId);
    const [error, setError] = useState<string | null>(null);
    const [duplicate, setDuplicate] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setName('');
            setBirthDate('');
            setGender(null);
            setClassId(defaultClassId);
            setError(null);
            setDuplicate(false);
        }
    }, [open, defaultClassId]);

    const submit = async (force: boolean) => {
        setBusy(true);
        setError(null);
        try {
            await api(`/api/link/${token}/new-friend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    birthDate,
                    gender,
                    classId: classId || null,
                    gradeId: classId ? null : defaultGradeId || null,
                    date,
                    force,
                }),
            });
            onCreated(name.trim());
        } catch (err) {
            const e = err as Error & { status?: number };
            setDuplicate(e.status === 409);
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const ready = name.trim() && birthDate && gender;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>새 친구 등록</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    <TextField
                        label="생년월일"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <ToggleButtonGroup exclusive value={gender} onChange={(_, v) => v && setGender(v)} fullWidth>
                        <ToggleButton value="M">남</ToggleButton>
                        <ToggleButton value="F">여</ToggleButton>
                    </ToggleButtonGroup>
                    <TextField select label="반" value={classId} onChange={(e) => setClassId(e.target.value)}>
                        <MenuItem value="">미배정</MenuItem>
                        {classes.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                    </TextField>
                    {error && <Alert severity={duplicate ? 'warning' : 'error'}>{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>취소</Button>
                {duplicate ? (
                    <Button variant="contained" color="warning" disabled={busy} onClick={() => submit(true)}>
                        다른 친구예요, 등록
                    </Button>
                ) : (
                    <Button variant="contained" disabled={!ready || busy} onClick={() => submit(false)}>
                        등록하고 출석
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
