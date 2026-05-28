import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { AttendanceMatrixRow } from '@/hooks/useAdminAttendance';
import { formatDateShort } from '@/utils/dateUtils';

interface AttendanceMatrixProps {
    rows: AttendanceMatrixRow[];
    dates: string[];
    grade: string;
    classNum: number;
}

function StatusCell({ 
    record, 
    showReason = false 
}: { 
    record: { status: boolean; reason?: string | null } | undefined;
    showReason?: boolean;
}) {
    if (record === undefined) {
        return <Typography variant="body2" color="text.disabled">-</Typography>;
    }
    const { status, reason } = record;
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography
                variant="body2"
                fontWeight="bold"
                sx={{ color: status ? 'success.main' : 'error.main' }}
            >
                {status ? '✓' : '✗'}
            </Typography>
            {showReason && !status && reason && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.5 }}>
                    ({reason})
                </Typography>
            )}
        </Box>
    );
}

function downloadCSV(rows: AttendanceMatrixRow[], dates: string[], grade: string, classNum: number) {
    const showClass = classNum === 0;
    const baseHeader = showClass ? ['학년', '반', '번호', '이름'] : ['번호', '이름'];
    const header = [...baseHeader, ...dates.map(formatDateShort), '출석', '결석', '출석률'].join(',');
    const dataRows = rows.map((row) => {
        const baseCells = showClass
            ? [row.student.grade, row.student.classNum, row.student.number, row.student.name]
            : [row.student.number, row.student.name];
        const cells = [
            ...baseCells,
            ...dates.map((d) => {
                const s = row.records[d];
                if (s === undefined) return '-';
                return s.status ? 'O' : s.reason ? `X(${s.reason})` : 'X';
            }),
            row.presentCount,
            row.absentCount,
            row.presentCount + row.absentCount > 0
                ? `${Math.round((row.presentCount / (row.presentCount + row.absentCount)) * 100)}%`
                : '-',
        ];
        return cells.join(',');
    });

    const csv = '﻿' + [header, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `출석_${grade}_${classNum === 0 ? '전체' : `${classNum}반`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AttendanceMatrix({ rows, dates, grade, classNum }: AttendanceMatrixProps) {
    const stickyCell = { position: 'sticky' as const, background: 'white', zIndex: 1 };
    const showClass = classNum === 0;
    const nameLeft = showClass ? 96 : 48;

    // 1. 고급 필터 제어 상태
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedGrades, setSelectedGrades] = React.useState<string[]>([]);
    const [selectedClasses, setSelectedClasses] = React.useState<number[]>([]);
    const [sortBy, setSortBy] = React.useState<string>('default');

    // 2. 현재 데이터셋 내 존재하는 유니크 학년 및 반 추출
    const availableGrades = React.useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => set.add(r.student.grade));
        return Array.from(set).sort();
    }, [rows]);

    const availableClasses = React.useMemo(() => {
        const set = new Set<number>();
        rows.forEach((r) => set.add(r.student.classNum));
        return Array.from(set).sort((a, b) => a - b);
    }, [rows]);

    // 원본 데이터셋 갱신 시 필터 다중 선택 초기화
    React.useEffect(() => {
        setSelectedGrades(availableGrades);
    }, [availableGrades]);

    React.useEffect(() => {
        setSelectedClasses(availableClasses);
    }, [availableClasses]);

    // 3. 다중 조건 복합 필터링 및 다차원 정렬 실행 파이프라인
    const filteredAndSortedRows = React.useMemo(() => {
        return rows
            .filter((row) => {
                // 이름 매칭 (공백 제거 및 대소문자 무시)
                if (searchTerm.trim() !== '') {
                    const term = searchTerm.toLowerCase().replace(/\s+/g, '');
                    const name = row.student.name.toLowerCase().replace(/\s+/g, '');
                    if (!name.includes(term)) return false;
                }
                // 학년 다중 매칭
                if (selectedGrades.length > 0 && !selectedGrades.includes(row.student.grade)) {
                    return false;
                }
                // 반 다중 매칭
                if (selectedClasses.length > 0 && !selectedClasses.includes(row.student.classNum)) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => {
                const totalA = a.presentCount + a.absentCount;
                const totalB = b.presentCount + b.absentCount;
                const rateA = totalA > 0 ? a.presentCount / totalA : -1;
                const rateB = totalB > 0 ? b.presentCount / totalB : -1;

                switch (sortBy) {
                    case 'name':
                        return a.student.name.localeCompare(b.student.name);
                    case 'attendanceDesc':
                        if (rateA !== rateB) return rateB - rateA;
                        return a.student.name.localeCompare(b.student.name);
                    case 'attendanceAsc':
                        if (rateA !== rateB) return rateA - rateB;
                        return a.student.name.localeCompare(b.student.name);
                    case 'default':
                    default:
                        if (a.student.grade !== b.student.grade) {
                            return a.student.grade.localeCompare(b.student.grade);
                        }
                        if (a.student.classNum !== b.student.classNum) {
                            return a.student.classNum - b.student.classNum;
                        }
                        return a.student.number - b.student.number;
                }
            });
    }, [rows, searchTerm, selectedGrades, selectedClasses, sortBy]);

    const handleGradeChange = (event: SelectChangeEvent<string[]>) => {
        const val = event.target.value;
        setSelectedGrades(typeof val === 'string' ? val.split(',') : val);
    };

    const handleClassChange = (event: SelectChangeEvent<number[]>) => {
        const val = event.target.value;
        setSelectedClasses(typeof val === 'string' ? val.split(',').map(Number) : val as number[]);
    };

    const handleSortChange = (event: SelectChangeEvent<string>) => {
        setSortBy(event.target.value);
    };

    return (
        <Box>
            {/* 고급 필터 제어 패널 */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.neutral' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="이름으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    {showClass && (
                        <>
                            <Grid item xs={6} sm={2.5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="filter-grade-label">학년 필터</InputLabel>
                                    <Select
                                        labelId="filter-grade-label"
                                        multiple
                                        value={selectedGrades}
                                        onChange={handleGradeChange}
                                        input={<OutlinedInput label="학년 필터" />}
                                        renderValue={(selected) => `${selected.length}개 학년 선택됨`}
                                    >
                                        {availableGrades.map((g) => (
                                            <MenuItem key={g} value={g}>
                                                <Checkbox checked={selectedGrades.indexOf(g) > -1} size="small" />
                                                <ListItemText primary={g} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6} sm={2.5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="filter-class-label">반 필터</InputLabel>
                                    <Select
                                        labelId="filter-class-label"
                                        multiple
                                        value={selectedClasses}
                                        onChange={handleClassChange}
                                        input={<OutlinedInput label="반 필터" />}
                                        renderValue={(selected) => `${selected.length}개 반 선택됨`}
                                    >
                                        {availableClasses.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                <Checkbox checked={selectedClasses.indexOf(c) > -1} size="small" />
                                                <ListItemText primary={`${c}반`} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </>
                    )}
                    <Grid item xs={12} sm={showClass ? 2 : 5}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="sort-select-label">정렬 기준</InputLabel>
                            <Select
                                labelId="sort-select-label"
                                value={sortBy}
                                label="정렬 기준"
                                onChange={handleSortChange}
                            >
                                <MenuItem value="default">기본 (학년/반/번호)</MenuItem>
                                <MenuItem value="name">이름 가나다순</MenuItem>
                                <MenuItem value="attendanceDesc">출석률 높은 순</MenuItem>
                                <MenuItem value="attendanceAsc">출석률 낮은 순</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            fullWidth
                            size="medium"
                            startIcon={<DownloadIcon />}
                            variant="contained"
                            onClick={() => downloadCSV(filteredAndSortedRows, dates, grade, classNum)}
                            disabled={filteredAndSortedRows.length === 0}
                        >
                            CSV 내보내기
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* 필터 결과 통계 요약 */}
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    검색 결과: 총 {filteredAndSortedRows.length}명
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto', maxHeight: 600 }}>
                <Table size="small" stickyHeader aria-label="attendance matrix">
                    <TableHead>
                        <TableRow>
                            {showClass && (
                                <TableCell align="center" sx={{ ...stickyCell, left: 0, minWidth: 48, zIndex: 3 }}>
                                    반
                                </TableCell>
                            )}
                            <TableCell align="center" sx={{ ...stickyCell, left: showClass ? 48 : 0, minWidth: 48, zIndex: 3 }}>
                                번호
                            </TableCell>
                            <TableCell sx={{ ...stickyCell, left: nameLeft, minWidth: 80, zIndex: 3 }}>
                                이름
                            </TableCell>
                            {dates.map((d) => (
                                <TableCell key={d} align="center" sx={{ minWidth: 60, px: 1 }}>
                                    <Typography variant="caption" display="block">{formatDateShort(d)}</Typography>
                                    <Typography variant="caption" color="text.secondary">(일)</Typography>
                                </TableCell>
                            ))}
                            <TableCell align="center" sx={{ minWidth: 48, bgcolor: 'success.50' }}>출석</TableCell>
                            <TableCell align="center" sx={{ minWidth: 48, bgcolor: 'error.50' }}>결석</TableCell>
                            <TableCell align="center" sx={{ minWidth: 60 }}>출석률</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAndSortedRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={dates.length + (showClass ? 6 : 5)} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                    필터와 일치하는 데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedRows.map((row) => {
                                const total = row.presentCount + row.absentCount;
                                const rate = total > 0 ? Math.round((row.presentCount / total) * 100) : null;
                                return (
                                    <TableRow key={row.student.id} hover>
                                        {showClass && (
                                            <TableCell align="center" sx={{ ...stickyCell, left: 0, fontWeight: 'bold' }}>
                                                {row.student.classNum}반
                                            </TableCell>
                                        )}
                                        <TableCell align="center" sx={{ ...stickyCell, left: showClass ? 48 : 0, fontWeight: 'bold' }}>
                                            {row.student.number}
                                        </TableCell>
                                        <TableCell sx={{ ...stickyCell, left: nameLeft }}>
                                            {row.student.name}
                                        </TableCell>
                                        {dates.map((d) => (
                                            <TableCell key={d} align="center" sx={{ px: 1 }}>
                                                <StatusCell 
                                                    record={row.records[d]} 
                                                    showReason={dates.length === 1}
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                            {row.presentCount}
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                            {row.absentCount}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={rate !== null && rate >= 80 ? 'success.main' : 'warning.main'}
                                            >
                                                {rate !== null ? `${rate}%` : '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
