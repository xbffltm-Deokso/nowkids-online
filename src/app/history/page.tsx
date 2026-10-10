'use client';

import { useState, useEffect } from 'react';
import { 
    Container, 
    Box, 
    Typography, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    CircularProgress, 
    Alert,
    IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { fetchAttendance } from '@/lib/api-client';
import { AttendanceRecord } from '@/types';
import { useGrades } from '@/hooks/useGrades';
import { addWeeks, getSundayOfCurrentWeek } from '@/utils/dateUtils';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import ButtonAtom from '@/components/atoms/ButtonAtom';
import GradeClassSelect from '@/components/molecules/GradeClassSelect';

// 한 번에 불러오는 기간(주). "이전 기록 더 보기"마다 이만큼 늘어남
const WEEKS_PER_PAGE = 12;

export default function HistoryPage() {
    const { grades, classes, loading: gradesLoading } = useGrades();
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState(1);
    const [weeks, setWeeks] = useState(WEEKS_PER_PAGE);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (grades.length > 0 && !selectedGrade) {
            setSelectedGrade(grades[0]);
        }
    }, [grades, selectedGrade]);

    const from = addWeeks(getSundayOfCurrentWeek(), -(weeks - 1));

    useEffect(() => {
        if (!selectedGrade) return;
        // 조건이 바뀌면 이전 요청의 늦은 응답은 무시
        let ignore = false;

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAttendance(selectedGrade, selectedClass, { from });
                if (!ignore) setRecords(data);
            } catch (err) {
                if (ignore) return;
                console.error(err);
                setError('기록을 불러오는 중 오류가 발생했습니다.');
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchHistory();
        return () => {
            ignore = true;
        };
    }, [selectedGrade, selectedClass, from]);

    if (gradesLoading) {
        return (
            <Container sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Link href="/" passHref>
                    <IconButton color="primary">
                        <ArrowBackIcon />
                    </IconButton>
                </Link>
                <TypographyAtom variant="h4" component="h1" fontWeight="bold" color="primary">
                    출석 기록 확인
                </TypographyAtom>
            </Box>

            <Box sx={{ mb: 4 }}>
                <GradeClassSelect
                    grades={grades}
                    classes={classes}
                    selectedGrade={selectedGrade}
                    selectedClass={selectedClass}
                    onGradeChange={(g) => {
                        setSelectedGrade(g);
                        setWeeks(WEEKS_PER_PAGE); // 학년/반이 바뀌면 다시 최근 기간부터
                    }}
                    onClassChange={(c) => {
                        setSelectedClass(c);
                        setWeeks(WEEKS_PER_PAGE);
                    }}
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>날짜</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>이름</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>상태</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>사유</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {records.length > 0 ? (
                                records.map((record) => (
                                    <TableRow key={record.id} hover>
                                        <TableCell>{record.date}</TableCell>
                                        <TableCell>{record.studentName}</TableCell>
                                        <TableCell>
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    color: record.status ? 'success.main' : 'error.main',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {record.status ? '출석' : '결석'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{record.reason || '-'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        기록이 없습니다.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {!loading && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <TypographyAtom variant="body2" color="text.secondary">
                        {from} 이후 기록
                    </TypographyAtom>
                    <ButtonAtom
                        label="이전 기록 더 보기"
                        variant="outlined"
                        size="small"
                        onClick={() => setWeeks((w) => w + WEEKS_PER_PAGE)}
                    />
                </Box>
            )}
        </Container>
    );
}
