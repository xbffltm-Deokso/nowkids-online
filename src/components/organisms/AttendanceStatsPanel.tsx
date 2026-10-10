'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import { useAdminAttendance } from '@/hooks/useAdminAttendance';
import {
    formatDateShort,
    getQuarter,
    getQuarterRange,
    getSundayOfCurrentWeek,
    getSundaysInRange,
} from '@/utils/dateUtils';

type Period = 1 | 2 | 3 | 4 | 'year';

interface Count {
    present: number;
    recorded: number;
}

interface WeekStat {
    date: string;
    total: Count;
    groups: Record<string, Count>; // 학년 또는 "학년|반" → 인원
    lowRecord: boolean;
}

// 기록 인원이 재적의 절반 미만인 주는 "기록 적음"으로 표시 (결석과 구분)
const LOW_RECORD_RATIO = 0.5;

function rateOf({ present, recorded }: Count): number | null {
    return recorded > 0 ? Math.round((present / recorded) * 100) : null;
}

function emptyCount(): Count {
    return { present: 0, recorded: 0 };
}

export default function AttendanceStatsPanel() {
    const today = getSundayOfCurrentWeek();
    const [year, setYear] = useState(Number(today.slice(0, 4)));
    const [period, setPeriod] = useState<Period>(getQuarter(today));
    const [byClass, setByClass] = useState(false);

    const { rows, loading, error } = useAdminAttendance('all', 0);

    // 표·그래프의 열 묶음: 학년별 또는 학년·반별
    const groupKeys = useMemo(() => {
        const keys = new Set<string>();
        for (const { student } of rows) {
            if (student.status === '전학') continue;
            keys.add(byClass ? `${student.grade}|${student.classNum}` : student.grade);
        }
        return Array.from(keys).sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }));
    }, [rows, byClass]);

    const enrolled = useMemo(() => rows.filter((r) => r.student.status !== '전학').length, [rows]);

    const weeks = useMemo((): WeekStat[] => {
        const range = period === 'year'
            ? { start: `${year}-01-01`, end: `${year}-12-31` }
            : getQuarterRange(year, period);
        // 아직 오지 않은 주일은 제외
        const dates = getSundaysInRange(range.start, range.end).filter((d) => d <= today);

        return dates.map((date) => {
            const total = emptyCount();
            const groups: Record<string, Count> = {};
            for (const { student, records } of rows) {
                const record = records[date];
                if (!record) continue;
                const key = byClass ? `${student.grade}|${student.classNum}` : student.grade;
                groups[key] ??= emptyCount();
                groups[key].recorded++;
                total.recorded++;
                if (record.status) {
                    groups[key].present++;
                    total.present++;
                }
            }
            return { date, total, groups, lowRecord: total.recorded < enrolled * LOW_RECORD_RATIO };
        });
    }, [rows, year, period, byClass, today, enrolled]);

    // 평균·최다는 기록이 충분한 주만으로 계산 (기록 적은 주는 결석이 아니라 미입력이라 평균을 왜곡함)
    const summary = useMemo(() => {
        const recordedWeeks = weeks.filter((w) => w.total.recorded > 0 && !w.lowRecord);
        const sum = recordedWeeks.reduce(
            (acc, w) => ({ present: acc.present + w.total.present, recorded: acc.recorded + w.total.recorded }),
            emptyCount()
        );
        const best = recordedWeeks.reduce<WeekStat | null>(
            (top, w) => (!top || w.total.present > top.total.present ? w : top),
            null
        );
        return {
            recordedWeeks: recordedWeeks.length,
            avgPresent: recordedWeeks.length ? Math.round((sum.present / recordedWeeks.length) * 10) / 10 : null,
            avgRate: rateOf(sum),
            best,
        };
    }, [weeks]);

    const maxPresent = Math.max(1, ...weeks.map((w) => w.total.present));
    const groupLabel = (key: string) => (byClass ? key.replace('|', ' ') + '반' : key);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* 기간 선택 */}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Select size="small" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                    {[0, 1, 2].map((offset) => {
                        const y = Number(today.slice(0, 4)) - offset;
                        return <MenuItem key={y} value={y}>{y}년</MenuItem>;
                    })}
                </Select>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={period}
                    onChange={(_, v: Period | null) => v !== null && setPeriod(v)}
                >
                    {[1, 2, 3, 4].map((q) => (
                        <ToggleButton key={q} value={q}>{q}분기</ToggleButton>
                    ))}
                    <ToggleButton value="year">연간</ToggleButton>
                </ToggleButtonGroup>
                <FormControlLabel
                    control={<Switch checked={byClass} onChange={(e) => setByClass(e.target.checked)} />}
                    label="반별 보기"
                />
            </Stack>

            {/* 요약 */}
            <Grid container spacing={2}>
                {[
                    { label: '평균 출석 인원', value: summary.avgPresent !== null ? `${summary.avgPresent}명` : '-' },
                    { label: '평균 출석률', value: summary.avgRate !== null ? `${summary.avgRate}%` : '-' },
                    {
                        label: '최다 출석 주',
                        value: summary.best ? `${formatDateShort(summary.best.date)} · ${summary.best.total.present}명` : '-',
                    },
                    {
                        label: '집계한 주 / 재적',
                        value: `${summary.recordedWeeks}주 / ${enrolled}명`,
                    },
                ].map((card) => (
                    <Grid item xs={6} md={3} key={card.label}>
                        <Paper sx={{ p: 2 }}>
                            <TypographyAtom variant="caption" color="text.secondary">{card.label}</TypographyAtom>
                            <TypographyAtom variant="h6" fontWeight="bold">{card.value}</TypographyAtom>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* 주별 출석 인원 막대그래프 */}
            <Paper sx={{ p: 2 }}>
                <TypographyAtom variant="subtitle1" fontWeight="bold" gutterBottom>
                    주별 출석 인원
                </TypographyAtom>
                {weeks.length === 0 ? (
                    <TypographyAtom variant="body2" color="text.secondary">이 기간에 지난 주일이 없습니다.</TypographyAtom>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 180, borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
                        {weeks.map((w) => (
                            <Tooltip
                                key={w.date}
                                arrow
                                title={
                                    w.total.recorded > 0
                                        ? `${w.date} · 출석 ${w.total.present}명 / 기록 ${w.total.recorded}명 (${rateOf(w.total)}%)${w.lowRecord ? ' · 기록 적음' : ''}`
                                        : `${w.date} · 기록 없음`
                                }
                            >
                                <Box sx={{ flex: '1 0 18px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'default' }}>
                                    <TypographyAtom variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                        {w.total.recorded > 0 ? w.total.present : ''}
                                    </TypographyAtom>
                                    <Box
                                        sx={{
                                            width: '70%',
                                            maxWidth: 28,
                                            height: `${(w.total.present / maxPresent) * 140}px`,
                                            bgcolor: w.lowRecord ? 'grey.400' : 'primary.main',
                                            borderRadius: '4px 4px 0 0',
                                        }}
                                    />
                                </Box>
                            </Tooltip>
                        ))}
                    </Box>
                )}
                {weeks.length > 0 && (
                    <Box sx={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
                        {weeks.map((w) => (
                            <TypographyAtom key={w.date} variant="caption" color="text.secondary" sx={{ flex: '1 0 18px', textAlign: 'center', fontSize: 10 }}>
                                {formatDateShort(w.date)}
                            </TypographyAtom>
                        ))}
                    </Box>
                )}
                <TypographyAtom variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                    회색 막대는 기록 인원이 재적의 절반 미만인 주(기록 적음)이며, 위 평균·최다 계산에서 제외합니다.
                </TypographyAtom>
            </Paper>

            {/* 주별 표 */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>날짜</TableCell>
                            {groupKeys.map((key) => (
                                <TableCell key={key} align="center">{groupLabel(key)}</TableCell>
                            ))}
                            <TableCell align="center">전체 출석</TableCell>
                            <TableCell align="center">출석률</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...weeks].reverse().map((w) => {
                            const rate = rateOf(w.total);
                            return (
                                <TableRow key={w.date} hover>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {w.date}
                                        {w.total.recorded > 0 && w.lowRecord && (
                                            <Chip label="기록 적음" size="small" sx={{ ml: 1 }} />
                                        )}
                                    </TableCell>
                                    {groupKeys.map((key) => {
                                        const g = w.groups[key];
                                        return (
                                            <TableCell key={key} align="center">
                                                {g ? (
                                                    <>
                                                        <b>{g.present}</b>
                                                        <TypographyAtom component="span" variant="caption" color="text.secondary">
                                                            /{g.recorded}
                                                        </TypographyAtom>
                                                    </>
                                                ) : '-'}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell align="center">
                                        {w.total.recorded > 0 ? (
                                            <>
                                                <b>{w.total.present}</b>
                                                <TypographyAtom component="span" variant="caption" color="text.secondary">
                                                    /{w.total.recorded}
                                                </TypographyAtom>
                                            </>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="center">{rate !== null ? `${rate}%` : '-'}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TypographyAtom variant="caption" color="text.secondary">
                칸의 숫자는 출석 인원/기록 인원이며, 출석률은 그 주에 기록이 있는 학생 중 출석한 비율입니다. 재적은 현재 재학·휴학 학생 수입니다.
            </TypographyAtom>
        </Stack>
    );
}
