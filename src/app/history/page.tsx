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
import { getAuth, signInAnonymously } from 'firebase/auth';
import { dataConnect } from '@/lib/firebase';
import { getAttendanceHistory } from '@/lib/generated';
import { useGrades } from '@/hooks/useGrades';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import GradeClassSelect from '@/components/molecules/GradeClassSelect';

export default function HistoryPage() {
    const { grades, classes, loading: gradesLoading } = useGrades();
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState(1);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (grades.length > 0 && !selectedGrade) {
            setSelectedGrade(grades[0]);
        }
    }, [grades, selectedGrade]);

    useEffect(() => {
        if (!selectedGrade) return;

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const auth = getAuth();
                if (!auth.currentUser) {
                    await signInAnonymously(auth);
                }

                const res = await getAttendanceHistory(dataConnect, { 
                    grade: selectedGrade, 
                    classNum: selectedClass 
                });
                setRecords(res.data.attendanceRecords);
            } catch (err) {
                console.error(err);
                setError('기록을 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [selectedGrade, selectedClass]);

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
                    onGradeChange={setSelectedGrade}
                    onClassChange={setSelectedClass}
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
                                        <TableCell>{record.student.name}</TableCell>
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
        </Container>
    );
}
