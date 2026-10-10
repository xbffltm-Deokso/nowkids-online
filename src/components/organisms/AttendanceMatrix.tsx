import React, { useState, useMemo, useEffect } from 'react';
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
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import { AttendanceMatrixRow, AttendanceChange } from '@/hooks/useAdminAttendance';
import { formatDateShort } from '@/utils/dateUtils';

export type PendingChange = AttendanceChange;

interface AttendanceMatrixProps {
    rows: AttendanceMatrixRow[];
    dates: string[];
    grade: string;
    classNum: number;
    onSaveBatch?: (changes: Record<string, AttendanceChange>) => Promise<boolean>;
}

function StatusCell({ 
    record, 
    showReason = false,
    isPending = false,
    rowIndex,
    colIndex,
    studentId,
    date,
    currentStatus,
    onToggle
}: { 
    record: { status: boolean; reason?: string | null } | undefined;
    showReason?: boolean;
    isPending?: boolean;
    rowIndex: number;
    colIndex: number;
    studentId: string;
    date: string;
    currentStatus: boolean | undefined;
    onToggle: (studentId: string, date: string, currentStatus: boolean | undefined) => void;
}) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            onToggle(studentId, date, currentStatus);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            let nextRow = rowIndex;
            let nextCol = colIndex;
            if (e.key === 'ArrowUp') nextRow--;
            if (e.key === 'ArrowDown') nextRow++;
            if (e.key === 'ArrowLeft') nextCol--;
            if (e.key === 'ArrowRight') nextCol++;
            
            const nextCell = document.querySelector(`[data-cell="${nextRow}-${nextCol}"]`) as HTMLElement;
            if (nextCell) nextCell.focus();
        }
    };

    const status = record?.status;
    const reason = record?.reason;

    return (
        <Box 
            data-cell={`${rowIndex}-${colIndex}`}
            tabIndex={0}
            onClick={() => onToggle(studentId, date, currentStatus)}
            onKeyDown={handleKeyDown}
            sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                minHeight: 36,
                cursor: 'pointer',
                bgcolor: isPending ? 'warning.100' : 'transparent',
                border: isPending ? '1px solid' : '1px solid transparent',
                borderColor: isPending ? 'warning.main' : 'transparent',
                borderRadius: 1,
                outline: 'none',
                transition: 'all 0.1s',
                '&:focus': {
                    boxShadow: '0 0 0 2px #1976d2',
                    bgcolor: isPending ? 'warning.200' : 'action.hover'
                },
                '&:hover': {
                    bgcolor: isPending ? 'warning.200' : 'action.hover'
                }
            }}
        >
            {record === undefined ? (
                <Typography variant="body2" color="text.disabled">-</Typography>
            ) : (
                <>
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
                </>
            )}
        </Box>
    );
}

function downloadCSV(
    rows: AttendanceMatrixRow[], 
    dates: string[], 
    grade: string, 
    classNum: number,
    pendingChanges: Record<string, PendingChange>
) {
    const showClass = classNum === 0;
    const baseHeader = showClass ? ['학년', '반', '이름'] : ['이름'];
    const header = [...baseHeader, ...dates.map(formatDateShort), '출석', '결석', '출석률'].join(',');
    const dataRows = rows.map((row) => {
        const baseCells = showClass
            ? [row.student.grade, row.student.classNum, row.student.name]
            : [row.student.name];
            
        const cells = [
            ...baseCells,
            ...dates.map((d) => {
                const key = `${row.student.id}_${d}`;
                const pending = pendingChanges[key];
                const s = pending ? (pending.status !== undefined ? { status: pending.status, reason: pending.reason } : undefined) : row.records[d];
                
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

    const csv = '\uFEFF' + [header, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `출석_${grade}_${classNum === 0 ? '전체' : `${classNum}반`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AttendanceMatrix({ rows, dates, grade, classNum, onSaveBatch }: AttendanceMatrixProps) {
    const stickyCell = { position: 'sticky' as const, background: 'white', zIndex: 1 };
    const showClass = classNum === 0;
    const nameLeft = showClass ? 48 : 0;

    // 1. 고급 필터 제어 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState<string>('default');
    const [sortHistory, setSortHistory] = useState<string[]>(['default']);
    
    // 2. 임시 저장 상태 (Batch Save)
    const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    const pendingCount = Object.keys(pendingChanges).length;

    // 데이터 변경 시 pending 비우기
    useEffect(() => {
        setPendingChanges({});
    }, [grade, classNum, dates]);

    const availableGrades = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => set.add(r.student.grade));
        return Array.from(set).sort();
    }, [rows]);

    const availableClasses = useMemo(() => {
        const set = new Set<number>();
        rows.forEach((r) => set.add(r.student.classNum));
        return Array.from(set).sort((a, b) => a - b);
    }, [rows]);

    useEffect(() => { setSelectedGrades(availableGrades); }, [availableGrades]);
    useEffect(() => { setSelectedClasses(availableClasses); }, [availableClasses]);

    const filteredAndSortedRows = useMemo(() => {
        return rows
            .filter((row) => {
                if (searchTerm.trim() !== '') {
                    const term = searchTerm.toLowerCase().replace(/\s+/g, '');
                    const name = row.student.name.toLowerCase().replace(/\s+/g, '');
                    if (!name.includes(term)) return false;
                }
                if (selectedGrades.length > 0 && !selectedGrades.includes(row.student.grade)) return false;
                if (selectedClasses.length > 0 && !selectedClasses.includes(row.student.classNum)) return false;
                return true;
            })
            .sort((a, b) => {
                const getComparison = (criterion: string) => {
                    const totalA = a.presentCount + a.absentCount;
                    const totalB = b.presentCount + b.absentCount;
                    const rateA = totalA > 0 ? a.presentCount / totalA : -1;
                    const rateB = totalB > 0 ? b.presentCount / totalB : -1;

                    switch (criterion) {
                        case 'name': return a.student.name.localeCompare(b.student.name, 'ko-KR');
                        case 'attendanceDesc': return rateB - rateA;
                        case 'attendanceAsc': return rateA - rateB;
                        case 'default':
                        default:
                            if (a.student.grade !== b.student.grade) return a.student.grade.localeCompare(b.student.grade);
                            if (a.student.classNum !== b.student.classNum) return a.student.classNum - b.student.classNum;
                            return a.student.name.localeCompare(b.student.name, 'ko-KR');
                    }
                };
                for (const criterion of sortHistory) {
                    const result = getComparison(criterion);
                    if (result !== 0) return result;
                }
                return 0;
            });
    }, [rows, searchTerm, selectedGrades, selectedClasses, sortHistory]);

    const handleToggle = (studentId: string, date: string, currentStatus: boolean | undefined) => {
        const key = `${studentId}_${date}`;
        const row = rows.find(r => r.student.id === studentId);
        const originalStatus = row?.records[date]?.status;

        setPendingChanges((prev) => {
            const next = { ...prev };
            
            let nextStatus: boolean | undefined = undefined;
            if (currentStatus === undefined) nextStatus = true;
            else if (currentStatus === true) nextStatus = false;
            else if (currentStatus === false) nextStatus = undefined;

            if (nextStatus === originalStatus) {
                delete next[key];
            } else {
                next[key] = { studentId, date, status: nextStatus, reason: null };
            }
            return next;
        });
    };

    const handleSaveBatch = async () => {
        if (!onSaveBatch || pendingCount === 0) return;
        setIsSaving(true);
        // status가 undefined인 변경은 "기록 없음"으로 되돌린 것 — 저장 시 기존 기록 삭제
        const success = await onSaveBatch(pendingChanges);
        if (success) {
            setPendingChanges({});
        }
        setIsSaving(false);
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
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                            }}
                        />
                    </Grid>
                    {showClass && (
                        <>
                            <Grid item xs={6} sm={2.5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>학년 필터</InputLabel>
                                    <Select
                                        multiple
                                        value={selectedGrades}
                                        onChange={(e) => setSelectedGrades(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                        input={<OutlinedInput label="학년 필터" />}
                                        renderValue={(s) => `${s.length}개 학년`}
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
                                    <InputLabel>반 필터</InputLabel>
                                    <Select
                                        multiple
                                        value={selectedClasses}
                                        onChange={(e) => setSelectedClasses(typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : e.target.value as number[])}
                                        input={<OutlinedInput label="반 필터" />}
                                        renderValue={(s) => `${s.length}개 반`}
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
                    <Grid item xs={12} sm={showClass ? 2 : 7}>
                        <FormControl fullWidth size="small">
                            <InputLabel>정렬 기준</InputLabel>
                            <Select
                                value={sortBy}
                                label="정렬 기준"
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setSortHistory((prev) => [e.target.value, ...prev.filter(k => k !== e.target.value)]);
                                }}
                            >
                                <MenuItem value="default">기본 (학년/반/이름)</MenuItem>
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
                            onClick={() => downloadCSV(filteredAndSortedRows, dates, grade, classNum, pendingChanges)}
                            disabled={filteredAndSortedRows.length === 0}
                        >
                            내보내기
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* 변경사항 및 통계 요약 바 */}
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 }}>
                <Typography variant="body2" color="text.secondary">
                    검색 결과: 총 {filteredAndSortedRows.length}명
                </Typography>
                
                {pendingCount > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" color="warning.main" fontWeight="bold">
                            {pendingCount}개의 변경사항 대기 중
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<CloseIcon />}
                            onClick={() => setPendingChanges({})}
                            disabled={isSaving}
                        >
                            취소
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                            onClick={handleSaveBatch}
                            disabled={isSaving}
                        >
                            변경사항 저장
                        </Button>
                    </Box>
                )}
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto', maxHeight: 600 }}>
                <Table size="small" stickyHeader aria-label="attendance matrix">
                    <TableHead>
                        <TableRow>
                            {showClass && (
                                <TableCell align="center" sx={{ ...stickyCell, left: 0, minWidth: 48, zIndex: 3 }}>반</TableCell>
                            )}
                            <TableCell sx={{ ...stickyCell, left: nameLeft, minWidth: 80, zIndex: 3 }}>이름</TableCell>
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
                            filteredAndSortedRows.map((row, rowIndex) => {
                                // 출석률 계산을 위해 Pending Changes 반영
                                let dynamicPresent = 0;
                                let dynamicAbsent = 0;
                                dates.forEach(d => {
                                    const key = `${row.student.id}_${d}`;
                                    const pending = pendingChanges[key];
                                    const s = pending ? (pending.status !== undefined ? { status: pending.status, reason: pending.reason } : undefined) : row.records[d];
                                    if (s) {
                                        if (s.status) dynamicPresent++;
                                        else dynamicAbsent++;
                                    }
                                });
                                const total = dynamicPresent + dynamicAbsent;
                                const rate = total > 0 ? Math.round((dynamicPresent / total) * 100) : null;

                                return (
                                    <TableRow key={row.student.id} hover>
                                        {showClass && (
                                            <TableCell align="center" sx={{ ...stickyCell, left: 0, fontWeight: 'bold' }}>
                                                {row.student.classNum}반
                                            </TableCell>
                                        )}
                                        <TableCell sx={{ ...stickyCell, left: nameLeft }}>
                                            {row.student.name}
                                        </TableCell>
                                        {dates.map((d, colIndex) => {
                                            const key = `${row.student.id}_${d}`;
                                            const pending = pendingChanges[key];
                                            const originalRecord = row.records[d];
                                            const isPending = !!pending;
                                            
                                            const currentRecord = isPending 
                                                ? (pending.status !== undefined ? { status: pending.status, reason: pending.reason } : undefined) 
                                                : originalRecord;
                                                
                                            const currentStatus = isPending ? pending.status : originalRecord?.status;

                                            return (
                                                <TableCell key={d} align="center" sx={{ p: 0.5 }}>
                                                    <StatusCell 
                                                        record={currentRecord} 
                                                        showReason={dates.length === 1}
                                                        isPending={isPending}
                                                        rowIndex={rowIndex}
                                                        colIndex={colIndex}
                                                        studentId={row.student.id}
                                                        date={d}
                                                        currentStatus={currentStatus}
                                                        onToggle={handleToggle}
                                                    />
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                            {dynamicPresent}
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                            {dynamicAbsent}
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
