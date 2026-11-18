'use client';

import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Link from 'next/link';

import { getSundayOfCurrentWeek } from '@/utils/dateUtils';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import ButtonAtom from '@/components/atoms/ButtonAtom';
import AttendanceForm from '@/components/organisms/AttendanceForm';
import { useAttendance } from '@/hooks/useAttendance';
import { useGrades } from '@/hooks/useGrades';

export default function HomePage() {
    const [date] = useState(getSundayOfCurrentWeek());
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState(1);

    const { grades, classes } = useGrades();
    const { students, attendance, loading, error, updateStatus, updateReason, saveAttendance, addStudent, removeStudent } = useAttendance(
        selectedGrade,
        selectedClass,
        date
    );

    useEffect(() => {
        if (grades.length > 0 && !selectedGrade) {
            setSelectedGrade(grades[0]);
        }
    }, [grades, selectedGrade]);

    return (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
                <Box>
                    <TypographyAtom variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                        덕소교회 교회학교 · 소년부
                    </TypographyAtom>
                    <TypographyAtom variant="h5" component="h1">
                        출석 체크
                    </TypographyAtom>
                    <TypographyAtom variant="body2" color="text.secondary">
                        {new Date(date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                        })}
                    </TypographyAtom>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Link href="/history" passHref style={{ textDecoration: 'none' }}>
                        <ButtonAtom label="출석 기록" variant="outlined" color="primary" sx={{ whiteSpace: 'nowrap' }} />
                    </Link>
                    <Link href="/admin" passHref style={{ textDecoration: 'none' }}>
                        <ButtonAtom label="관리" variant="contained" color="primary" sx={{ whiteSpace: 'nowrap' }} />
                    </Link>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <AttendanceForm
                    grades={grades}
                    classes={classes}
                    students={students}
                    attendance={attendance}
                    onGradeChange={setSelectedGrade}
                    onClassChange={setSelectedClass}
                    onStatusChange={updateStatus}
                    onReasonChange={updateReason}
                    onSubmit={saveAttendance}
                    onAddStudent={addStudent}
                    onRemoveStudent={removeStudent}
                    selectedGrade={selectedGrade}
                    selectedClass={selectedClass}
                />
            )}
        </Container>
    );
}
