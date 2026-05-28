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
import DownloadIcon from '@mui/icons-material/Download';
import { AttendanceMatrixRow } from '@/hooks/useAdminAttendance';
import { formatDateShort } from '@/utils/dateUtils';

interface AttendanceMatrixProps {
    rows: AttendanceMatrixRow[];
    dates: string[];
    grade: string;
    classNum: number;
}

function StatusCell({ status }: { status: boolean | undefined }) {
    if (status === undefined) {
        return <Typography variant="body2" color="text.disabled">-</Typography>;
    }
    return (
        <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ color: status ? 'success.main' : 'error.main' }}
        >
            {status ? '✓' : '✗'}
        </Typography>
    );
}

function downloadCSV(rows: AttendanceMatrixRow[], dates: string[], grade: string, classNum: number) {
    const header = ['번호', '이름', ...dates.map(formatDateShort), '출석', '결석', '출석률'].join(',');
    const dataRows = rows.map((row) => {
        const cells = [
            row.student.number,
            row.student.name,
            ...dates.map((d) => {
                const s = row.records[d];
                return s === null ? '-' : s ? 'O' : 'X';
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
    a.download = `출석_${grade}_${classNum}반.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AttendanceMatrix({ rows, dates, grade, classNum }: AttendanceMatrixProps) {
    const stickyCell = { position: 'sticky' as const, background: 'white', zIndex: 1 };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    variant="outlined"
                    onClick={() => downloadCSV(rows, dates, grade, classNum)}
                    disabled={rows.length === 0}
                >
                    CSV 다운로드
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto', maxHeight: 600 }}>
                <Table size="small" stickyHeader aria-label="attendance matrix">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={{ ...stickyCell, left: 0, minWidth: 48, zIndex: 3 }}>
                                번호
                            </TableCell>
                            <TableCell sx={{ ...stickyCell, left: 48, minWidth: 80, zIndex: 3 }}>
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
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={dates.length + 5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => {
                                const total = row.presentCount + row.absentCount;
                                const rate = total > 0 ? Math.round((row.presentCount / total) * 100) : null;
                                return (
                                    <TableRow key={row.student.id} hover>
                                        <TableCell align="center" sx={{ ...stickyCell, left: 0, fontWeight: 'bold' }}>
                                            {row.student.number}
                                        </TableCell>
                                        <TableCell sx={{ ...stickyCell, left: 48 }}>
                                            {row.student.name}
                                        </TableCell>
                                        {dates.map((d) => (
                                            <TableCell key={d} align="center" sx={{ px: 1 }}>
                                                <StatusCell status={row.records[d] as boolean | undefined} />
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
