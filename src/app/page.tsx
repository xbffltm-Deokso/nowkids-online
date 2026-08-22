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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <TypographyAtom variant="h4" component="h1" fontWeight="bold" color="primary">
                        출석체크 시스템
                    </TypographyAtom>
                    <TypographyAtom variant="body2" color="text.secondary">
                        {new Date(date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </TypographyAtom>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Link href="/history" passHref style={{ textDecoration: 'none' }}>
                        <ButtonAtom label="출석 기록" variant="outlined" color="primary" />
                    </Link>
                    <Link href="/admin" passHref style={{ textDecoration: 'none' }}>
                        <ButtonAtom label="Admin" variant="contained" color="secondary" />
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
