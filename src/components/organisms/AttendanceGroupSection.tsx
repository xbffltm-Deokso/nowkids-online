'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import AttendanceGroupChip from '@/components/atoms/AttendanceGroupChip';
import { useAttendanceGroups } from '@/hooks/useAttendanceGroups';
import { AttendanceMatrixRow } from '@/hooks/useAdminAttendance';
import { AttendanceGroup } from '@/types';
import { isActiveStatus } from '@/utils/studentStatus';

const GROUPS: AttendanceGroup[] = ['A', 'B', 'C', 'D', 'E'];
const GROUP_RANGE: Record<AttendanceGroup, string> = {
    A: '80% 이상',
    B: '60~80%',
    C: '40~60%',
    D: '20~40%',
    E: '20% 미만',
};
// 관심 필요: D·E 그룹이거나 최근 이만큼 연속으로 출석하지 않은 학생
const ABSENT_STREAK_ALERT = 4;

// 출석 통계 탭 하단 — 52주 출석 그룹 분포와 관심 필요 학생 목록
export default function AttendanceGroupSection({ rows }: { rows: AttendanceMatrixRow[] }) {
    const { result, byStudent, error, loading } = useAttendanceGroups();

    const activeStudents = useMemo(
        () => rows.map((r) => r.student).filter((s) => isActiveStatus(s.status)),
        [rows]
    );

    const distribution = useMemo(() => {
        const counts: Record<AttendanceGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        for (const s of activeStudents) {
            const group = byStudent.get(s.id)?.group;
            if (group) counts[group]++;
        }
        return counts;
    }, [activeStudents, byStudent]);

    const watchList = useMemo(() => {
        return activeStudents
            .map((student) => ({ student, summary: byStudent.get(student.id) }))
            .filter(({ summary }) =>
                summary && (summary.group === 'D' || summary.group === 'E' || summary.absentStreak >= ABSENT_STREAK_ALERT)
            )
            .sort((a, b) =>
                (b.summary?.absentStreak ?? 0) - (a.summary?.absentStreak ?? 0) ||
                (a.summary?.rate ?? 0) - (b.summary?.rate ?? 0)
            );
    }, [activeStudents, byStudent]);

    if (error) return <Alert severity="error">{error}</Alert>;
    if (loading || !result) return null;

    return (
        <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
                <TypographyAtom variant="subtitle1" fontWeight="bold">
                    출석 그룹 (최근 52주)
                </TypographyAtom>
                <TypographyAtom variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
                    {result.from} ~ {result.to} 중 출석부를 쓴 {result.countedWeeks}주 기준 · 처음 온 날 이후 주만 계산
                </TypographyAtom>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    {GROUPS.map((g) => (
                        <Paper key={g} variant="outlined" sx={{ px: 2, py: 1, minWidth: 96 }}>
                            <TypographyAtom variant="h6" fontWeight="bold">
                                {g} · {distribution[g]}명
                            </TypographyAtom>
                            <TypographyAtom variant="caption" color="text.secondary">
                                {GROUP_RANGE[g]}
                            </TypographyAtom>
                        </Paper>
                    ))}
                </Stack>
            </Paper>

            <Paper sx={{ p: 2 }}>
                <TypographyAtom variant="subtitle1" fontWeight="bold">
                    관심 필요 학생 ({watchList.length}명)
                </TypographyAtom>
                <TypographyAtom variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                    D·E 그룹이거나 최근 {ABSENT_STREAK_ALERT}주 이상 연속으로 출석하지 않은 학생
                </TypographyAtom>
                {watchList.length === 0 ? (
                    <TypographyAtom variant="body2" color="text.secondary">해당 학생이 없습니다.</TypographyAtom>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>학년</TableCell>
                                <TableCell>반</TableCell>
                                <TableCell>이름</TableCell>
                                <TableCell align="center">출석 그룹</TableCell>
                                <TableCell align="center">연속 결석</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {watchList.map(({ student, summary }) => (
                                <TableRow key={student.id} hover>
                                    <TableCell>{student.grade}</TableCell>
                                    <TableCell>{student.classNum}반</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell align="center">
                                        <AttendanceGroupChip summary={summary} />
                                    </TableCell>
                                    <TableCell align="center">
                                        {summary && summary.absentStreak > 0 ? (
                                            <TypographyAtom
                                                variant="body2"
                                                fontWeight={summary.absentStreak >= ABSENT_STREAK_ALERT ? 'bold' : 'normal'}
                                                color={summary.absentStreak >= ABSENT_STREAK_ALERT ? 'error.main' : 'text.primary'}
                                            >
                                                {summary.absentStreak}주
                                            </TypographyAtom>
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </Stack>
    );
}
